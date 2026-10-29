
const mongoose = require("mongoose");

// ============================================
// PAYMENT SCHEMA
// ============================================

const paymentSchema = new mongoose.Schema(
  {
    // ========================================
    // ORDER REFERENCE
    // ========================================

    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },

    // ========================================
    // GUEST PAYMENT — LOGIN NOT REQUIRED
    // ========================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // ========================================
    // PAYMENT AMOUNT — NO TAX
    // ========================================

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

    // ========================================
    // PAYMENT METHOD
    // ========================================

    paymentMethod: {
      type: String,
      enum: [
        "Cafeteria Wallet",
        "Payroll Deduction",
        "UPI / QR",
        "Cash on Pickup",
        "Counter Cash",
        "Counter UPI",
        "Online (Razorpay)",
      ],
      required: true,
    },

    // ========================================
    // PAYMENT STATUS
    // ========================================

    status: {
      type: String,
      enum: [
        "Initiated",
        "Processing",
        "Completed",
        "Failed",
        "Refunded",
      ],
      default: "Initiated",
    },

    // ========================================
    // INTERNAL PAYMENT ID
    // ========================================

    paymentId: {
      type: String,
      unique: true,
    },

    // ========================================
    // RAZORPAY ORDER ID
    // ========================================

    gatewayOrderId: {
      type: String,
      default: "",
    },

    // ========================================
    // TRANSACTION REFERENCE
    // ========================================

    transactionId: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// EXPORT PAYMENT MODEL
// ============================================

module.exports = mongoose.model(
  "Payment",
  paymentSchema
);
