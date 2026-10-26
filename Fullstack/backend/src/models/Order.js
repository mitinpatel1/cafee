const crypto = require('crypto');
const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  menuItemId: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  instructions: { type: String, default: '' },
});

const orderSchema = new mongoose.Schema(
  {
    orderNumber: { type: String, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    franchiseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Franchise' },
    items: [orderItemSchema],
    subtotal: { type: Number, required: true },
    tax: { type: Number, required: true },
    total: { type: Number, required: true },
    status: {
      type: String,
      enum: ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Picked Up', 'Cancelled'],
      default: 'Pending',
    },
    paymentMethod: {
      type: String,
      enum: ['Cafeteria Wallet', 'Payroll Deduction', 'UPI / QR', 'Cash on Pickup', 'Counter Cash', 'Counter UPI', 'Online (Razorpay)'],
      required: true,
    },
    paymentStatus: {
      type: String,
      enum: ['Pending', 'Paid', 'Failed', 'Refunded'],
      default: 'Pending',
    },
    pickupTime: { type: String, default: 'Awaiting service confirmation' },
    pickupCounter: { type: String, default: 'Counter 1 — Express & Meals' },
    notes: { type: String, default: '' },
    cancelReason: { type: String, default: '' },
    estimatedReadyTime: { type: Date, default: null },
    readyInMinutes: { type: Number, default: null },
    counterPaymentReference: { type: String, default: '' },
  },
  { timestamps: true }
);

// Auto-generate order number before saving
orderSchema.pre('save', function () {
  if (!this.orderNumber) {
    this.orderNumber = `OB-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  }
});

module.exports = mongoose.model('Order', orderSchema);
