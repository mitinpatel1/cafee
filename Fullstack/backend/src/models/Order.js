
const crypto = require("crypto");
const mongoose = require("mongoose");

// ============================================
// ORDER ITEM SCHEMA
// ============================================

const orderItemSchema = new mongoose.Schema({
  menuItemId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "MenuItem",
    required: true,
  },

  name: {
    type: String,
    required: true,
  },

  price: {
    type: Number,
    required: true,
    min: 0,
  },

  quantity: {
    type: Number,
    required: true,
    min: 1,
  },

  instructions: {
    type: String,
    default: "",
  },
});

// ============================================
// MAIN ORDER SCHEMA
// ============================================

const orderSchema = new mongoose.Schema(
  {
    // Unique Order Number
    orderNumber: {
      type: String,
      unique: true,
    },

    // ========================================
    // GUEST ORDER — LOGIN NOT REQUIRED
    // ========================================

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    isGuestOrder: {
      type: Boolean,
      default: false,
    },

    guestTokenHash: {
      type: String,
      select: false,
      default: "",
    },

    trackingCode: {
      type: String,
      unique: true,
      sparse: true,
      default: undefined,
    },

    // ========================================
    // AUTOMATIC SEAT NUMBER
    // ========================================

    seatNumber: {
      type: Number,
      default: null,
      min: 1,
    },

    // ========================================
    // FRANCHISE
    // ========================================

    franchiseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Franchise",
      required: true,
    },

    // ========================================
    // ORDER ITEMS
    // ========================================

    items: [orderItemSchema],

    // ========================================
    // PRICE CALCULATION — NO TAX
    // ========================================

    subtotal: {
      type: Number,
      required: true,
      min: 0,
    },

    tax: {
      type: Number,
      default: 0,
    },

    total: {
      type: Number,
      required: true,
      min: 0,
    },

    // ========================================
    // ORDER STATUS
    // ========================================

    status: {
      type: String,
      enum: [
        "Pending",
        "Confirmed",
        "Preparing",
        "Ready",
        "Picked Up",
        "Cancelled",
      ],
      default: "Pending",
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

    paymentStatus: {
      type: String,
      enum: [
        "Pending",
        "Paid",
        "Failed",
        "Refunded",
      ],
      default: "Pending",
    },

    // ========================================
    // PICKUP DETAILS
    // ========================================

    pickupTime: {
      type: String,
      default: "Awaiting service confirmation",
    },

    pickupCounter: {
      type: String,
      default: "Counter 1 — Express & Meals",
    },

    notes: {
      type: String,
      default: "",
    },

    cancelReason: {
      type: String,
      default: "",
    },

    // ========================================
    // PREPARATION TIME
    // ========================================

    estimatedReadyTime: {
      type: Date,
      default: null,
    },

    readyInMinutes: {
      type: Number,
      default: null,
    },

    // ========================================
    // COUNTER PAYMENT REFERENCE
    // ========================================

    counterPaymentReference: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// ============================================
// AUTOMATIC ORDER NUMBER GENERATION
// ============================================

orderSchema.pre("save", function () {
  if (!this.orderNumber) {
    const timestamp = Date.now()
      .toString(36)
      .toUpperCase();

    const random = crypto
      .randomBytes(3)
      .toString("hex")
      .toUpperCase();

    this.orderNumber = `OB-${timestamp}-${random}`;
  }
});

// ============================================
// EXPORT MODEL
// ============================================

module.exports = mongoose.model(
  "Order",
  orderSchema
);
