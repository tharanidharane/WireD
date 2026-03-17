import Friend from "../models/Friend.js";
import fs from "fs";
import Message from "../models/Message.js";
import path from "path";
import User from "../models/User.js";

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

const buildFriendProfile = async (friendRecord, currentUserId) => {
  const friendUser =
    friendRecord.requester._id.toString() === currentUserId.toString()
      ? friendRecord.recipient
      : friendRecord.requester;

  const lastMessage = await Message.findOne({
    $or: [
      { senderId: currentUserId, receiverId: friendUser._id },
      { senderId: friendUser._id, receiverId: currentUserId }
    ]
  }).sort({ timestamp: -1 });

  return {
    friendshipId: friendRecord._id,
    status: friendRecord.status,
    user: friendUser,
    lastMessage
  };
};

export const searchUsersByEmail = async (req, res) => {
  try {
    const { email = "" } = req.query;

    if (!email.trim()) {
      return res.json([]);
    }

    const users = await User.find({
      email: { $regex: email.trim(), $options: "i" },
      _id: { $ne: req.user._id }
    }).select("_id name email profilePicture createdAt");

    return res.json(users);
  } catch (error) {
    return res.status(500).json({ message: "Failed to search users", error: error.message });
  }
};

export const sendFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;

    if (!recipientId) {
      return res.status(400).json({ message: "Recipient is required" });
    }

    if (recipientId === req.user._id.toString()) {
      return res.status(400).json({ message: "You cannot add yourself" });
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({ message: "Recipient not found" });
    }

    const existing = await Friend.findOne({
      $or: [
        { requester: req.user._id, recipient: recipientId },
        { requester: recipientId, recipient: req.user._id }
      ]
    });

    if (existing) {
      const isReversePending =
        existing.status === "pending" &&
        existing.requester.toString() === recipientId &&
        existing.recipient.toString() === req.user._id.toString();

      if (isReversePending) {
        existing.status = "accepted";
        await existing.save();
        await existing.populate("requester", "_id name email profilePicture");
        await existing.populate("recipient", "_id name email profilePicture");

        return res.json({
          message: "Friend request accepted",
          friendship: existing
        });
      }

      return res.status(400).json({ message: `Friend request already ${existing.status}` });
    }

    const request = await Friend.create({
      requester: req.user._id,
      recipient: recipientId,
      status: "pending"
    });

    await request.populate("requester", "_id name email profilePicture");
    await request.populate("recipient", "_id name email profilePicture");

    return res.status(201).json({
      message: "Friend request sent",
      friendship: request
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to send request", error: error.message });
  }
};

export const acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    const request = await Friend.findById(requestId);

    if (!request) {
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Not allowed to accept this request" });
    }

    request.status = "accepted";
    await request.save();
    await request.populate("requester", "_id name email profilePicture");
    await request.populate("recipient", "_id name email profilePicture");

    return res.json(request);
  } catch (error) {
    return res.status(500).json({ message: "Failed to accept request", error: error.message });
  }
};

export const getFriendRequests = async (req, res) => {
  try {
    const incoming = await Friend.find({
      recipient: req.user._id,
      status: "pending"
    })
      .populate("requester", "_id name email profilePicture createdAt")
      .sort({ createdAt: -1 });

    return res.json(incoming);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load requests", error: error.message });
  }
};

export const getFriends = async (req, res) => {
  try {
    const friendships = await Friend.find({
      status: "accepted",
      $or: [{ requester: req.user._id }, { recipient: req.user._id }]
    })
      .populate("requester", "_id name email profilePicture createdAt")
      .populate("recipient", "_id name email profilePicture createdAt")
      .sort({ updatedAt: -1 });

    const friends = await Promise.all(
      friendships.map((record) => buildFriendProfile(record, req.user._id))
    );

    return res.json(friends);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load friends", error: error.message });
  }
};

export const deleteFriend = async (req, res) => {
  try {
    const { friendshipId } = req.params;

    const friendship = await Friend.findById(friendshipId);

    if (!friendship) {
      return res.status(404).json({ message: "Friendship not found" });
    }

    const isParticipant =
      friendship.requester.toString() === req.user._id.toString() ||
      friendship.recipient.toString() === req.user._id.toString();

    if (!isParticipant) {
      return res.status(403).json({ message: "Not allowed to remove this friend" });
    }

    const friendUserId =
      friendship.requester.toString() === req.user._id.toString()
        ? friendship.recipient
        : friendship.requester;

    const messages = await Message.find({
      $or: [
        { senderId: req.user._id, receiverId: friendUserId },
        { senderId: friendUserId, receiverId: req.user._id }
      ]
    });

    messages.forEach((message) => removeMediaFile(message.mediaUrl));

    await Message.deleteMany({
      $or: [
        { senderId: req.user._id, receiverId: friendUserId },
        { senderId: friendUserId, receiverId: req.user._id }
      ]
    });

    await friendship.deleteOne();

    return res.json({ message: "Friend removed" });
  } catch (error) {
    return res.status(500).json({ message: "Failed to remove friend", error: error.message });
  }
};
