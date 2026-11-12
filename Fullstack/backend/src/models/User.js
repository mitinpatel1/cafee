
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    role: {
      type: String,
      enum: [
        "user",
        "employee",
        "staff",
        "admin",
        "superadmin",
        "franchise",
      ],
      default: "user",
    },

    department: {
      type: String,
      default: "",
    },

    employeeId: {
      type: String,
      default: "",
    },

    phone: {
      type: String,
      default: "",
    },

    balance: {
      type: Number,
      default: 0,
    },

    // User profile picture URL
    avatar: {
      type: String,
      default: "",
    },

    // Incremented after password reset to invalidate previously issued JWTs.
    tokenVersion: {
      type: Number,
      default: 0,
    },

    // Password-reset data is never returned by normal User queries or JSON.
    passwordResetOtpHash: { type: String, select: false },
    passwordResetExpiresAt: { type: Date, select: false },
    passwordResetAttempts: { type: Number, default: 0, select: false },
    passwordResetLastSentAt: { type: Date, select: false },
    passwordResetSendWindowAt: { type: Date, select: false },
    passwordResetSendCount: { type: Number, default: 0, select: false },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetTokenExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compare(password, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.tokenVersion;
  delete obj.passwordResetOtpHash;
  delete obj.passwordResetExpiresAt;
  delete obj.passwordResetAttempts;
  delete obj.passwordResetLastSentAt;
  delete obj.passwordResetSendWindowAt;
  delete obj.passwordResetSendCount;
  delete obj.passwordResetTokenHash;
  delete obj.passwordResetTokenExpiresAt;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
