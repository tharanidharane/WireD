import Friend from "../models/Friend.js";
import Group from "../models/Group.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

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

const populateGroup = async (group) =>
  group.populate([
    { path: "creator", select: "_id name email profilePicture" },
    { path: "members", select: "_id name email profilePicture" }
  ]);

const getLatestGroupMessage = async (groupId) => {
  const lastMessage = await Message.findOne({
    conversationType: "group",
    groupId
  })
    .populate("senderId", "_id name email profilePicture")
    .sort({ timestamp: -1 });

  return lastMessage ? normalizeMessage(lastMessage) : null;
};

export const getGroups = async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("creator", "_id name email profilePicture")
      .populate("members", "_id name email profilePicture")
      .sort({ updatedAt: -1 });

    const data = await Promise.all(
      groups.map(async (group) => ({
        ...group.toObject(),
        _id: group._id.toString(),
        creator: group.creator
          ? {
              _id: group.creator._id.toString(),
              name: group.creator.name,
              email: group.creator.email,
              profilePicture: group.creator.profilePicture || ""
            }
          : null,
        members: group.members.map((member) => ({
          _id: member._id.toString(),
          name: member.name,
          email: member.email,
          profilePicture: member.profilePicture || ""
        })),
        lastMessage: await getLatestGroupMessage(group._id)
      }))
    );

    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: "Failed to load groups", error: error.message });
  }
};

export const createGroup = async (req, res) => {
  try {
    const { name = "", memberIds = [] } = req.body;
    const normalizedName = name.trim();

    if (!normalizedName) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const uniqueMemberIds = [...new Set((Array.isArray(memberIds) ? memberIds : []).filter(Boolean))];
    const participantIds = [...new Set([req.user._id.toString(), ...uniqueMemberIds])];

    if (participantIds.length < 2) {
      return res.status(400).json({ message: "Add at least one member to create a group" });
    }

    const users = await User.find({ _id: { $in: participantIds } }).select("_id name email profilePicture");
    if (users.length !== participantIds.length) {
      return res.status(400).json({ message: "One or more selected members do not exist" });
    }

    const otherMemberIds = participantIds.filter((memberId) => memberId !== req.user._id.toString());
    const friendships = await Friend.find({
      status: "accepted",
      $or: [
        { requester: req.user._id, recipient: { $in: otherMemberIds } },
        { requester: { $in: otherMemberIds }, recipient: req.user._id }
      ]
    });

    const connectedUserIds = new Set();
    friendships.forEach((friendship) => {
      const requesterId = friendship.requester.toString();
      const recipientId = friendship.recipient.toString();
      const otherId = requesterId === req.user._id.toString() ? recipientId : requesterId;
      connectedUserIds.add(otherId);
    });

    const invalidMemberId = otherMemberIds.find((memberId) => !connectedUserIds.has(memberId));
    if (invalidMemberId) {
      return res.status(400).json({ message: "You can add only accepted friends to a group" });
    }

    const group = await Group.create({
      name: normalizedName,
      creator: req.user._id,
      members: participantIds
    });

    await populateGroup(group);

    return res.status(201).json({
      ...group.toObject(),
      _id: group._id.toString(),
      creator: {
        _id: group.creator._id.toString(),
        name: group.creator.name,
        email: group.creator.email,
        profilePicture: group.creator.profilePicture || ""
      },
      members: group.members.map((member) => ({
        _id: member._id.toString(),
        name: member.name,
        email: member.email,
        profilePicture: member.profilePicture || ""
      })),
      lastMessage: null
    });
  } catch (error) {
    return res.status(500).json({ message: "Failed to create group", error: error.message });
  }
};
