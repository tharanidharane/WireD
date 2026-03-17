import Message from "../models/Message.js";
import { emitToUser } from "../socket/socket.js";
import fs from "fs";
import path from "path";

const createMediaUrl = (req) =>
  req.file ? `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}` : "";

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
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ]
    }).sort({ timestamp: 1 });

    return res.json(messages);
  } catch (error) {
    return res.status(500).json({ message: "Failed to fetch messages", error: error.message });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const { messageText = "", mediaType = "text" } = req.body;
    const mediaUrl = createMediaUrl(req);
    const normalizedText = messageText.trim();
    const effectiveType = req.file ? mediaType : "text";

    if (!normalizedText && !mediaUrl) {
      return res.status(400).json({ message: "Message content is required" });
    }

    const message = await Message.create({
      senderId: req.user._id,
      receiverId,
      messageText: normalizedText,
      mediaUrl,
      mediaType: mediaUrl ? effectiveType : "text"
    });

    emitToUser(req.io, receiverId, "message:new", message.toObject());

    return res.status(201).json(message);
  } catch (error) {
    return res.status(500).json({ message: "Failed to send message", error: error.message });
  }
};

export const getRecentChats = async (req, res) => {
  try {
    const recent = await Message.aggregate([
      {
        $match: {
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

    emitToUser(req.io, message.receiverId, "message:deleted", { messageId });

    return res.json({ message: "Message deleted", messageId });
  } catch (error) {
    return res.status(500).json({ message: "Failed to delete message", error: error.message });
  }
};

export const clearConversation = async (req, res) => {
  try {
    const { userId } = req.params;

    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: userId },
        { senderId: userId, receiverId: req.user._id }
      ]
    });

    messages.forEach((message) => removeMediaFile(message.mediaUrl));

    await Message.deleteMany({
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
