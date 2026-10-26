const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema(
  {
    franchiseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Franchise', required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    price: { type: Number, required: true, min: 0 },
    category: {
      type: String,
      required: true,
      enum: ['Breakfast', 'Lunch', 'Snacks', 'Beverages', 'Desserts'],
    },
    image: { type: String, default: '' },
    emoji: { type: String, default: '🍽️' },
    isVeg: { type: Boolean, default: true },
    isAvailable: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    preparationTime: { type: Number, default: 10 }, // in minutes
    calories: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text index for search
menuItemSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('MenuItem', menuItemSchema);
