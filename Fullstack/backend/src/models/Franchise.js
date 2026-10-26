const mongoose = require('mongoose');

const franchiseSchema = new mongoose.Schema(
  {
    menuSeeded: { type: Boolean, default: false },
    starterMenuInitialized: { type: Boolean, default: false },
    name: { type: String, required: true, trim: true },
    brandName: { type: String, required: true, trim: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    location: { type: String, default: '' },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'Pending', 'Suspended'],
      default: 'Active',
    },
    plan: {
      type: String,
      enum: ['Basic', 'Standard', 'Premium'],
      default: 'Standard',
    },
    staffCount: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    openTime: { type: String, default: '08:00' },
    closeTime: { type: String, default: '18:00' },
    features: [{ type: String }], // e.g., ['WiFi', 'AC', 'Parking']
  },
  { timestamps: true }
);

module.exports = mongoose.model('Franchise', franchiseSchema);
