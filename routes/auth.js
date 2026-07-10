import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const router = express.Router();

// ── Register ──────────────────────────────────────────────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: "All fields required" });

    const existemail = await User.findOne({ email });
    if (existemail)
      return res.status(400).json({ message: "Email already exists" });

    const hashpassword = await bcrypt.hash(password, 10);

    const user = new User({ name, email, password: hashpassword });
    await user.save();

    res.status(201).json({ message: "Registered Successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ── Login ─────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user)
      return res.status(400).json({ message: "User not found" });

    // ✅ Blocked user check
    if (user.blocked)
      return res.status(403).json({ message: "Your account has been blocked" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Wrong password" });

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET || "secrete123",
      { expiresIn: "1d" }
    );

    return res.json({
      message: "Login Successfully",
      token,
      role: user.role,
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server Error" });
  }
});

// ── Logout ────────────────────────────────────────────────
router.post("/logout", (req, res) => {
  return res.json({ message: "Logged out successfully" });
});

export default router;