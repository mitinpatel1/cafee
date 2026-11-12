const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const { sendPasswordResetOtp } = require('../services/passwordResetMailer');

const { protect, authorize } = require("../middleware/auth");
const { avatarUploadMiddleware } = require("../middleware/avatarUpload");

const router = express.Router();

// Generate JWT token
const generateToken = (userId, tokenVersion = 0) => {
  return jwt.sign({ id: userId, tokenVersion }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

const {
  getImageExtension,
  saveAvatar,
  removeAvatarFile,
} = require("../utils/avatarStorage");
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

    const token = generateToken(user._id, user.tokenVersion || 0);

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

    const token = generateToken(user._id, user.tokenVersion || 0);

    res.json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── PASSWORD RESET HELPERS ──────────────────
const RESET_OTP_TTL_MS = 10 * 60 * 1000;
const RESET_TOKEN_TTL_MS = 10 * 60 * 1000;
const RESET_RESEND_COOLDOWN_MS = 60 * 1000;
const RESET_SEND_WINDOW_MS = 15 * 60 * 1000;
const RESET_MAX_SENDS = 3;
const RESET_MAX_ATTEMPTS = 5;
const RESET_SELECT = [
  '+passwordResetOtpHash',
  '+passwordResetExpiresAt',
  '+passwordResetAttempts',
  '+passwordResetLastSentAt',
  '+passwordResetSendWindowAt',
  '+passwordResetSendCount',
  '+passwordResetTokenHash',
  '+passwordResetTokenExpiresAt',
].join(' ');

function normalizeResetInput(body = {}) {
  return {
    email: typeof body.email === 'string' ? body.email.trim().toLowerCase() : '',
    portal: body.portal === 'admin' || body.portal === 'franchise' ? body.portal : '',
  };
}

function otpDigest(userId, otp) {
  const secret = process.env.PASSWORD_RESET_SECRET || process.env.JWT_SECRET;
  if (!secret) throw new Error('Password reset secret is not configured.');
  return crypto.createHmac('sha256', secret).update(`${userId}:${otp}`).digest('hex');
}

function resetTokenDigest(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function safeEqualHex(left, right) {
  if (typeof left !== 'string' || typeof right !== 'string' ||
      !/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(left, 'hex'), Buffer.from(right, 'hex'));
}

function clearPasswordReset(user) {
  user.passwordResetOtpHash = undefined;
  user.passwordResetExpiresAt = undefined;
  user.passwordResetAttempts = 0;
  user.passwordResetTokenHash = undefined;
  user.passwordResetTokenExpiresAt = undefined;
}

// ────────────────── POST /api/auth/forgot-password ──────────────────
// Sends a short-lived OTP only to an existing account of the selected portal.
router.post('/forgot-password', async (req, res) => {
  try {
    const { email, portal } = normalizeResetInput(req.body);
    if (!email || !portal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Enter a valid registered email address.' });
    }

    const user = await User.findOne({ email, role: portal }).select(RESET_SELECT);
    const genericMessage = 'If an eligible account exists, a password reset code has been sent to its registered email.';
    if (!user) return res.json({ success: true, message: genericMessage, resendAfterSeconds: 60 });

    const now = Date.now();
    if (user.passwordResetLastSentAt && now - user.passwordResetLastSentAt.getTime() < RESET_RESEND_COOLDOWN_MS) {
      const wait = Math.ceil((RESET_RESEND_COOLDOWN_MS - (now - user.passwordResetLastSentAt.getTime())) / 1000);
      return res.status(429).json({ success: false, message: `Please wait ${wait} seconds before requesting another code.`, resendAfterSeconds: wait });
    }

    if (!user.passwordResetSendWindowAt || now - user.passwordResetSendWindowAt.getTime() >= RESET_SEND_WINDOW_MS) {
      user.passwordResetSendWindowAt = new Date(now);
      user.passwordResetSendCount = 0;
    }
    if ((user.passwordResetSendCount || 0) >= RESET_MAX_SENDS) {
      return res.status(429).json({ success: false, message: 'Too many reset codes requested. Please try again after 15 minutes.' });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    user.passwordResetOtpHash = otpDigest(user._id, otp);
    user.passwordResetExpiresAt = new Date(now + RESET_OTP_TTL_MS);
    user.passwordResetAttempts = 0;
    user.passwordResetLastSentAt = new Date(now);
    user.passwordResetSendCount = (user.passwordResetSendCount || 0) + 1;
    user.passwordResetTokenHash = undefined;
    user.passwordResetTokenExpiresAt = undefined;
    await user.save();

    try {
      await sendPasswordResetOtp({
        to: user.email,
        name: user.name,
        portal,
        otp,
        expiresMinutes: 10,
      });
    } catch (mailError) {
      clearPasswordReset(user);
      user.passwordResetLastSentAt = undefined;
      await user.save();
      console.error('Password reset email failed:', mailError.message);
      if (mailError.code === 'SMTP_NOT_CONFIGURED') {
        return res.status(503).json({ success: false, message: 'Email service is not configured. Add SMTP settings in backend/.env and restart the backend.' });
      }
      return res.status(503).json({ success: false, message: 'Could not send the reset email. Check SMTP settings and try again.' });
    }

    return res.json({ success: true, message: genericMessage, resendAfterSeconds: 60 });
  } catch (error) {
    console.error('Forgot password error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not start password reset. Please try again.' });
  }
});

// ────────────────── POST /api/auth/verify-reset-otp ──────────────────
// OTP is one-time; a successful check returns a short-lived reset token.
router.post('/verify-reset-otp', async (req, res) => {
  try {
    const { email, portal } = normalizeResetInput(req.body);
    const otp = typeof req.body?.otp === 'string' ? req.body.otp.trim() : String(req.body?.otp || '').trim();
    if (!email || !portal || !/^\d{6}$/.test(otp)) {
      return res.status(400).json({ success: false, message: 'Enter the 6-digit code sent to your email.' });
    }

    const user = await User.findOne({ email, role: portal }).select(RESET_SELECT);
    if (!user || !user.passwordResetOtpHash || !user.passwordResetExpiresAt) {
      return res.status(400).json({ success: false, message: 'The code is invalid or expired. Request a new code.' });
    }

    if (user.passwordResetExpiresAt.getTime() <= Date.now()) {
      clearPasswordReset(user);
      await user.save();
      return res.status(400).json({ success: false, message: 'The code has expired. Request a new code.' });
    }

    if ((user.passwordResetAttempts || 0) >= RESET_MAX_ATTEMPTS) {
      clearPasswordReset(user);
      await user.save();
      return res.status(429).json({ success: false, message: 'Too many incorrect attempts. Request a new code.' });
    }

    user.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
    const submittedDigest = otpDigest(user._id, otp);
    if (!safeEqualHex(submittedDigest, user.passwordResetOtpHash)) {
      if (user.passwordResetAttempts >= RESET_MAX_ATTEMPTS) clearPasswordReset(user);
      await user.save();
      return res.status(400).json({ success: false, message: 'Incorrect code. Please check the email and try again.' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetTokenHash = resetTokenDigest(resetToken);
    user.passwordResetTokenExpiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);
    user.passwordResetOtpHash = undefined;
    user.passwordResetExpiresAt = undefined;
    user.passwordResetAttempts = 0;
    await user.save();

    return res.json({ success: true, resetToken, message: 'Email verified. You can now set a new password.' });
  } catch (error) {
    console.error('Verify reset OTP error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not verify the code. Please try again.' });
  }
});

// ────────────────── POST /api/auth/reset-password ──────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { email, portal } = normalizeResetInput(req.body);
    const resetToken = typeof req.body?.resetToken === 'string' ? req.body.resetToken.trim() : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!email || !portal || !/^[a-f0-9]{64}$/i.test(resetToken)) {
      return res.status(400).json({ success: false, message: 'Password reset session is invalid. Start again.' });
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return res.status(400).json({ success: false, message: 'New password must be between 8 and 128 characters.' });
    }

    const user = await User.findOne({ email, role: portal }).select(RESET_SELECT);
    if (!user || !user.passwordResetTokenHash || !user.passwordResetTokenExpiresAt ||
        user.passwordResetTokenExpiresAt.getTime() <= Date.now() ||
        !safeEqualHex(resetTokenDigest(resetToken), user.passwordResetTokenHash)) {
      if (user) {
        clearPasswordReset(user);
        await user.save();
      }
      return res.status(400).json({ success: false, message: 'Password reset session is invalid or expired. Request a new code.' });
    }

    user.password = newPassword; // User pre-save hook hashes this with bcrypt.
    user.tokenVersion = (user.tokenVersion || 0) + 1; // Invalidate all existing JWT sessions.
    clearPasswordReset(user);
    user.passwordResetLastSentAt = undefined;
    user.passwordResetSendWindowAt = undefined;
    user.passwordResetSendCount = 0;
    await user.save();

    return res.json({ success: true, message: 'Password updated successfully. Sign in using your new password.' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    return res.status(500).json({ success: false, message: 'Could not update the password. Please try again.' });
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



// POST /api/auth/profile/avatar

router.post(
  "/profile/avatar",
  protect,
  authorize("user", "employee"),
  avatarUploadMiddleware,
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please choose a photo.",
      });
    }

    const extension = getImageExtension(req.file.buffer);

    if (!extension) {
      return res.status(400).json({
        success: false,
        message: "Invalid image. Use JPG, PNG or WebP.",
      });
    }

    let newAvatar = "";

    try {
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Account not found.",
        });
      }

      const oldAvatar = user.avatar;

      newAvatar = await saveAvatar(
        user._id,
        req.file.buffer,
        extension
      );

      user.avatar = newAvatar;

      await user.save();

      await removeAvatarFile(oldAvatar);

      return res.json({
        success: true,
        message: "Profile photo updated.",
        user: user.toJSON(),
      });
    } catch (error) {
      if (newAvatar) {
        await removeAvatarFile(newAvatar);
      }

      console.error("Avatar upload failed:", error);

      return res.status(500).json({
        success: false,
        message: "Could not save profile photo.",
      });
    }
  }
);


// DELETE /api/auth/profile/avatar

router.delete(
  "/profile/avatar",
  protect,
  authorize("user", "employee"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Account not found.",
        });
      }

      const oldAvatar = user.avatar;

      user.avatar = "";

      await user.save();

      await removeAvatarFile(oldAvatar);

      return res.json({
        success: true,
        message: "Profile photo removed.",
        user: user.toJSON(),
      });
    } catch (error) {
      console.error("Avatar deletion failed:", error);

      return res.status(500).json({
        success: false,
        message: "Could not remove profile photo.",
      });
    }
  }
);


module.exports = router;
