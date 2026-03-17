import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  messageText: {
    type: String,
    default: ""
  },
  mediaUrl: {
    type: String,
    default: ""
  },
  mediaType: {
    type: String,
    enum: ["text", "image", "video", "audio", "file"],
    default: "text"
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

messageSchema.index({ senderId: 1, receiverId: 1, timestamp: -1 });

const Message = mongoose.model("Message", messageSchema);

export default Message;
