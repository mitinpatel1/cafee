const mongoose = require("mongoose");

const paymentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
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
      ],
      required: true,
    },
    status: {
      type: String,
      enum: ["Initiated", "Processing", "Completed", "Failed", "Refunded"],
      default: "Initiated",
    },
    paymentId: {
      type: String,
      unique: true,
    },
    gatewayOrderId: { type: String, default: "" },

    // Each UPI QR is uniquely associated with a guest order.
    gatewayQrId: {
      type: String,
      default: "",
    },
    gatewayQrImageUrl: {
      type: String,
      default: "",
    },
    expiresAt: {
      type: Date,
      default: null,
    },

    transactionId: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Uniqueness for real gateway IDs, ignoring default empty values.
paymentSchema.index(
  { transactionId: 1 },
  { unique: true, partialFilterExpression: { transactionId: { $gt: "" } } }
);
paymentSchema.index(
  { gatewayQrId: 1 },
  { unique: true, partialFilterExpression: { gatewayQrId: { $gt: "" } } }
);

module.exports = mongoose.model("Payment", paymentSchema);
