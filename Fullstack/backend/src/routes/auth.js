const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// ────────────────── POST /api/auth/register ──────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!name?.trim() || !email?.trim() || !password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Name, email, and password of at least 8 characters are required.' });
    }
    // Check if email already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered.' });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: 'user',
      phone: phone || '',
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── POST /api/auth/login ──────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password.' });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── GET /api/auth/profile ──────────────────
router.get('/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── PUT /api/auth/profile ──────────────────
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, department, employeeId, phone, avatar } = req.body;
    const user = await User.findById(req.user._id);

    if (typeof name === 'string' && name.trim()) user.name = name.trim();
    if (department !== undefined) user.department = department;
    if (employeeId !== undefined) user.employeeId = employeeId;
    if (phone !== undefined) user.phone = phone;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    res.json({ success: true, user: user.toJSON() });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── POST /api/auth/wallet/recharge ──────────────────
router.post('/wallet/recharge', protect, (_req, res) => {
  res.status(503).json({ success: false, message: 'Wallet recharge is unavailable until a verified payment provider is configured.' });
});

module.exports = router;
