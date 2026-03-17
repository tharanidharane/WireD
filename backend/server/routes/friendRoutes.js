import express from "express";
import {
  acceptFriendRequest,
  deleteFriend,
  getFriendRequests,
  getFriends,
  searchUsersByEmail,
  sendFriendRequest
} from "../controllers/friendController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.get("/search", searchUsersByEmail);
router.get("/requests", getFriendRequests);
router.get("/", getFriends);
router.post("/request", sendFriendRequest);
router.patch("/accept/:requestId", acceptFriendRequest);
router.delete("/:friendshipId", deleteFriend);

export default router;
