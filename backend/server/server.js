import "dotenv/config";
import cors from "cors";
import express from "express";
import http from "http";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { Server } from "socket.io";
import connectDB from "./config/db.js";
import authRoutes from "./routes/authRoutes.js";
import friendRoutes from "./routes/friendRoutes.js";
import groupRoutes from "./routes/groupRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import { initializeSocket } from "./socket/socket.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const normalizeOrigin = (value = "") => value.trim().replace(/\/+$/, "");

const configuredClientUrls = [
  process.env.CLIENT_URL,
  ...(process.env.CLIENT_URLS || "").split(",")
]
  .map((value) => normalizeOrigin(value || ""))
  .filter(Boolean);

const allowedOrigins = new Set([
  ...configuredClientUrls,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174"
].map(normalizeOrigin));

const vercelPreviewRegex = /^https:\/\/[a-z0-9-]+\.vercel\.app$/i;

const corsOptions = {
  origin: (origin, callback) => {
    const normalizedOrigin = normalizeOrigin(origin || "");

    // Allow browserless tools and common local dev origins.
    if (!origin || allowedOrigins.has(normalizedOrigin) || vercelPreviewRegex.test(normalizedOrigin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
};

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: corsOptions
});

connectDB();
initializeSocket(io);

app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));
app.use((req, _, next) => {
  req.io = io;
  next();
});
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get("/api/health", (_, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/groups", groupRoutes);
app.use("/api/messages", messageRoutes);

app.use((error, _, res, __) => {
  if (error.message?.includes("Only JPG")) {
    return res.status(400).json({ message: error.message });
  }

  return res.status(500).json({ message: "Internal server error" });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
