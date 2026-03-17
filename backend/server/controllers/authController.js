import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const createToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });

const serializeUser = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  profilePicture: user.profilePicture,
  bio: user.bio || "",
  createdAt: user.createdAt
});

export const signup = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password?.trim();

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword
    });

    return res.status(201).json({
      token: createToken(user._id),
      user: serializeUser(user)
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }

    return res.status(500).json({ message: "Signup failed", error: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password?.trim();

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    return res.json({
      token: createToken(user._id),
      user: serializeUser(user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Login failed", error: error.message });
  }
};

export const getMe = async (req, res) => res.json(serializeUser(req.user));

export const updateProfile = async (req, res) => {
  try {
    const name = req.body.name?.trim();
    const bio = req.body.bio?.trim() || "";

    if (!name) {
      return res.status(400).json({ message: "Name is required" });
    }

    req.user.name = name;
    req.user.bio = bio.slice(0, 280);
    await req.user.save();

    return res.json({
      message: "Profile updated",
      user: serializeUser(req.user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not update profile" });
  }
};

export const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Please choose an image to upload" });
    }

    req.user.profilePicture = `/uploads/${req.file.filename}`;
    await req.user.save();

    return res.json({
      message: "Profile picture updated",
      user: serializeUser(req.user)
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not update profile picture" });
  }
};
