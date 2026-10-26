const mongoose = require('mongoose');

// The published 50-item starter catalogue exists even before a franchise registers.
// Real branch menu items are copied from this source on first initialization.
const dailyMenuCatalogItemSchema = new mongoose.Schema({
  catalogKey: { type: String, required: true, unique: true, immutable: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true, min: 0 },
  category: { type: String, required: true, enum: ['Breakfast', 'Lunch', 'Snacks', 'Beverages'] },
  image: { type: String, default: '' },
  isVeg: { type: Boolean, default: true },
  isAvailable: { type: Boolean, default: true },
  isPopular: { type: Boolean, default: false },
  preparationTime: { type: Number, default: 10 },
}, { timestamps: true });

module.exports = mongoose.model('DailyMenuCatalogItem', dailyMenuCatalogItemSchema);
