import express from "express";
import {
  getMe,
  login,
  signup,
  updateProfile,
  updateProfilePicture
} from "../controllers/authController.js";
import protect from "../middleware/authMiddleware.js";
import { profilePictureUpload } from "../utils/upload.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/me", protect, getMe);
router.patch("/profile", protect, updateProfile);
router.patch(
  "/profile-picture",
  protect,
  profilePictureUpload.single("profilePicture"),
  updateProfilePicture
);

export default router;
