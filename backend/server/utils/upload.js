import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, "..", "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadDir),
  filename: (_, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const safeName = file.originalname.replace(/\s+/g, "-");
    cb(null, `${unique}-${safeName}`);
  }
});

const createFileFilter = (allowedMimeTypes, errorMessage) => (_, file, cb) => {
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(errorMessage));
  }
};

export const messageUpload = multer({
  storage,
  fileFilter: createFileFilter(
    [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "video/mp4",
      "video/webm",
      "audio/webm",
      "audio/mpeg",
      "audio/wav",
      "audio/ogg"
    ],
    "Only JPG, PNG, MP4, WEBM, MP3, WAV, and OGG files are allowed"
  ),
  limits: { fileSize: 25 * 1024 * 1024 }
});

export const profilePictureUpload = multer({
  storage,
  fileFilter: createFileFilter(
    ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    "Only JPG, PNG, or WEBP images are allowed"
  ),
  limits: { fileSize: 5 * 1024 * 1024 }
});
