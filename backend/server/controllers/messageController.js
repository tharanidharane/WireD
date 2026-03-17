import Message from "../models/Message.js";
import Group from "../models/Group.js";
import { emitToUser } from "../socket/socket.js";
import fs from "fs";
import path from "path";

const createMediaUrl = (req) =>
  req.file ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}` : "";

const normalizeMessage = (message) => {
  const raw = typeof message.toObject === "function" ? message.toObject() : message;
  const sender = raw.senderId && typeof raw.senderId === "object" && raw.senderId._id
    ? {
        _id: raw.senderId._id.toString(),
        name: raw.senderId.name,
        email: raw.senderId.email,
        profilePicture: raw.senderId.profilePicture || ""
      }
    : raw.sender;

  return {
    ...raw,
    _id: raw._id?.toString?.() || raw._id,
    senderId: sender?._id || raw.senderId?.toString?.() || raw.senderId,
    receiverId: raw.receiverId?.toString?.() || raw.receiverId || null,
    groupId: raw.groupId?.toString?.() || raw.groupId || null,
    sender,
    conversationType: raw.conversationType || "direct"
  };
};

const populateMessage = (query) => query.populate("senderId", "_id name email profilePicture");

const emitToGroupMembers = (io, memberIds, event, payload, excludeUserId = null) => {
  memberIds.forEach((memberId) => {
    if (excludeUserId && memberId.toString() === excludeUserId.toString()) {
      return;
    }

    emitToUser(io, memberId, event, payload);
  });
};

const removeMediaFile = (mediaUrl = "") => {
  if (!mediaUrl) return;

  try {
    const fileName = mediaUrl.split("/uploads/")[1];
    if (!fileName) return;

    const filePath = path.join(process.cwd(), "server", "uploads", fileName);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Failed to remove media file:", error.message);
  }
};

export const getMessages = async (req, res) => {
  try {
    const { userId, groupId } = req.params;

    if (groupId) {
      const group = await Group.findOne({ _id: groupId, members: req.user._id });

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const messages = await populateMessage(
        Message.find({
          conversationType: "group",
          groupId
        }).sort({ timestamp: 1 })
      );

      return res.json(messages.map(normalizeMessage));
    }

    const messages = await populateMessage(
      Message.find({
        conversationType: "direct",
        $or: [
          { senderId: req.user._id, receiverId: userId },
          { senderId: userId, receiverId: req.user._id }
        ]
      }).sort({ timestamp: 1 })
    );

    return res.json(messages.map(normalizeMessage));
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, groupId } = req.params;
    const { messageText = "", mediaType = "text" } = req.body;
    const mediaUrl = createMediaUrl(req);
    const normalizedText = messageText.trim();
    const effectiveType = req.file ? mediaType : "text";

    if (!normalizedText && !mediaUrl) {
      return res.status(400).json({ message: "Message content is required" });
    }

    let conversationType = "direct";
    let recipientIds = [];

    if (groupId) {
      const group = await Group.findOne({ _id: groupId, members: req.user._id });

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      conversationType = "group";
      recipientIds = group.members
        .map((memberId) => memberId.toString())
        .filter((memberId) => memberId !== req.user._id.toString());
    } else if (!receiverId) {
      return res.status(400).json({ message: "Receiver is required" });
    }

    const message = await Message.create({
      senderId: req.user._id,
      receiverId: groupId ? null : receiverId,
      groupId: groupId || null,
      conversationType,
      messageText: normalizedText,
      mediaUrl,
      mediaType: mediaUrl ? effectiveType : "text"
    });

    const populatedMessage = await populateMessage(Message.findById(message._id));
    const normalizedMessage = normalizeMessage(populatedMessage);

    if (groupId) {
      emitToGroupMembers(req.io, recipientIds, "message:new", normalizedMessage, req.user._id);
    } else {
      emitToUser(req.io, receiverId, "message:new", normalizedMessage);
    }

    return res.status(201).json(normalizedMessage);
  } catch (error) {
    return res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

export const getRecentChats = async (req, res) => {
  try {
    const recent = await Message.aggregate([
      {
        $match: {
          conversationType: "direct",
          $or: [{ senderId: req.user._id }, { receiverId: req.user._id }]
        }
      },
      { $sort: { timestamp: -1 } },
      {
        $addFields: {
          friendId: {
            $cond: [{ $eq: ["$senderId", req.user._id] }, "$receiverId", "$senderId"]
          }
        }
      },
      {
        $group: {
          _id: "$friendId",
          latestMessage: { $first: "$$ROOT" }
        }
      }
    ]);

    return res.json(recent);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load recent chats", error: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.senderId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can delete only your own messages" });
    }

    removeMediaFile(message.mediaUrl);
    await message.deleteOne();

    if (message.conversationType === "group" && message.groupId) {
      const group = await Group.findById(message.groupId).select("members");

      if (group) {
        emitToGroupMembers(req.io, group.members, "message:deleted", {
          messageId,
          groupId: message.groupId.toString()
        }, req.user._id);
      }
    } else {
      emitToUser(req.io, message.receiverId, "message:deleted", { messageId });
    }

    return res.json({ message: "Message deleted", messageId });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete message", error: error.message });
  }
};

export const clearConversation = async (req, res) => {
  try {
    const { userId, groupId } = req.params;

    if (groupId) {
      const group = await Group.findOne({ _id: groupId, members: req.user._id }).select("members");

      if (!group) {
        return res.status(404).json({ message: "Group not found" });
      }

      const messages = await Message.find({
        conversationType: "group",
        groupId
      });

      messages.forEach((message) => removeMediaFile(message.mediaUrl));

      await Message.deleteMany({
        conversationType: "group",
        groupId
      });

      emitToGroupMembers(req.io, group.members, "chat:cleared", {
        from: req.user._id.toString(),
        groupId
      }, req.user._id);

      return res.json({ message: "Group chat cleared" });
    }

    const messages = await Message.find({
      conversationType: "direct",
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ]
    });

    messages.forEach((message) => removeMediaFile(message.mediaUrl));

    await Message.deleteMany({
      conversationType: "direct",
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ]
    });

    emitToUser(req.io, userId, "chat:cleared", {
      from: req.user._id.toString()
    });

    return res.json({ message: "Chat cleared" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to clear chat", error: error.message });
  }
};
