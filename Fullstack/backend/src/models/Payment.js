
const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    amount: {
      type: Number,
      required: true,
      min: 0,
    },

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
        "Online (Cashfree)",
      ],
      required: true,
    },

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
      index: true,
    },

    // Internal payment reference
    paymentId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Payment gateway information
    gatewayName: {
      type: String,
      enum: ["Cashfree", "Razorpay", "Manual"],
      default: null,
    },

    // Cashfree order ID or Razorpay order ID
    gatewayOrderId: {
      type: String,
      default: "",
    },

    // Cashfree payment session ID returned by Create Order API
    paymentSessionId: {
      type: String,
      default: "",
    },

    // Gateway transaction/payment ID
    gatewayPaymentId: {
      type: String,
      default: "",
    },

    // Cashfree payment status
    gatewayPaymentStatus: {
      type: String,
      default: "",
    },

    // Gateway checkout URL, if provided
    paymentLink: {
      type: String,
      default: "",
    },

    // QR information for supported QR payment flows
    gatewayQrId: {
      type: String,
      default: "",
    },

    gatewayQrImageUrl: {
      type: String,
      default: "",
    },

    // QR/payment session expiry
    expiresAt: {
      type: Date,
      default: null,
    },

    // Final transaction reference
    transactionId: {
      type: String,
      default: "",
    },

    // Payment completion timestamp
    paidAt: {
      type: Date,
      default: null,
    },

    // Gateway webhook tracking
    webhookReceived: {
      type: Boolean,
      default: false,
    },

    webhookReceivedAt: {
      type: Date,
      default: null,
    },

    // Optional gateway response information
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  { timestamps: true }
);

// Prevent duplicate real transaction IDs.
paymentSchema.index(
  { transactionId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      transactionId: { $gt: "" },
    },
  }
);

// Prevent duplicate QR IDs.
paymentSchema.index(
  { gatewayQrId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      gatewayQrId: { $gt: "" },
    },
  }
);

// Prevent duplicate gateway order IDs.
paymentSchema.index(
  { gatewayOrderId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      gatewayOrderId: { $gt: "" },
    },
  }
);

// Useful for finding an order's latest payment.
paymentSchema.index({
  orderId: 1,
  createdAt: -1,
});

module.exports = mongoose.model("Payment", paymentSchema);
