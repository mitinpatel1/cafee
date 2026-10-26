const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ['Cafeteria Wallet', 'Payroll Deduction', 'UPI / QR', 'Cash on Pickup', 'Counter Cash', 'Counter UPI', 'Online (Razorpay)'],
      required: true,
    },
    status: {
      type: String,
      enum: ['Initiated', 'Processing', 'Completed', 'Failed', 'Refunded'],
      default: 'Initiated',
    },
    paymentId: { type: String, unique: true },       // Internal payment reference
    gatewayOrderId: { type: String, default: '' },    // Verified provider order ID
    transactionId: { type: String, default: '' },     // Final transaction reference
  },
  { timestamps: true }
);

module.exports = mongoose.model('Payment', paymentSchema);
