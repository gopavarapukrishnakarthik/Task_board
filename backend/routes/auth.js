const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { verifyToken, requireLead } = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    // ✅ Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // ✅ Hash and create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      status: "pending",
    });

    res
      .status(201)
      .json({ message: "Registration submitted, waiting for lead approval" });
  } catch (err) {
    console.error("Registration error:", err);
    res.status(500).json({ message: "Server error during registration" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ message: "Invalid credentials" });

  if (user.status !== "active") {
    return res
      .status(403)
      .json({ message: "Your account is not approved yet" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.status(400).json({ message: "Invalid credentials" });

  const tokenData = {
    userId: user._id,
    role: user.role, // ✅ add this
    name: user.name, // optional, for convenience
    email: user.email, // optional
  };

  const token = await jwt.sign(tokenData, process.env.JWT_SECRET, {
    expiresIn: "1d",
  });

  return res
    .status(200)
    .cookie("token", token, {
      maxAge: 1 * 24 * 60 * 60 * 1000,
      secure: false,
      httpsOnly: true,
      sameSite: "lax",
    })
    .json({
      message: `Welcome Back ${user.name}`,
      user,
      success: true,
    });
});

router.post("/logout", (req, res) => {
  try {
    return res.status(200).cookie("token", "", { maxAge: 0 }).json({
      message: "Logout Sucessfull",
      success: true,
    });
  } catch (error) {
    console.log(error);
  }
});

router.get("/users", async (req, res) => {
  try {
    const users = await User.find().select("_id name email role");
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error while fetching users" });
  }
});

// Get pending users
router.get("/pending-users", verifyToken, requireLead, async (req, res) => {
  try {
    const users = await User.find({ status: "pending" }).select(
      "_id name email role status"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching pending users" });
  }
});

// Approve user
router.put("/approve/:id", verifyToken, requireLead, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "active" },
      { new: true }
    );
    res.json({ message: "User approved", user });
  } catch (err) {
    res.status(500).json({ message: "Error approving user" });
  }
});

// Reject user
router.put("/reject/:id", verifyToken, requireLead, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: "rejected" },
      { new: true }
    );
    res.json({ message: "User rejected", user });
  } catch (err) {
    res.status(500).json({ message: "Error rejecting user" });
  }
});

module.exports = router;
