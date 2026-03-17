import express from "express";
import protect from "../middleware/authMiddleware.js";
import {
  clearConversation,
  deleteMessage,
  getMessages,
  getRecentChats,
  sendMessage
} from "../controllers/messageController.js";
import { messageUpload } from "../utils/upload.js";

const router = express.Router();

router.use(protect);
router.get("/recent", getRecentChats);
router.get("/group/:groupId", getMessages);
router.post("/group/:groupId", messageUpload.single("media"), sendMessage);
router.delete("/group/:groupId", clearConversation);
router.delete("/single/:messageId", deleteMessage);
router.delete("/conversation/:userId", clearConversation);
router.get("/:userId", getMessages);
router.post("/send/:receiverId", messageUpload.single("media"), sendMessage);

export default router;
