const mongoose = require('mongoose');

// Private inventory per outlet. Never shared across franchise owners.
const schema = new mongoose.Schema({
  franchiseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Franchise', required: true, index: true },
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, enum: ['Vegetables', 'Dairy', 'Grains', 'Spices', 'Meat', 'Beverages', 'Packaging', 'Other'], default: 'Other' },
  currentStock: { type: Number, required: true, min: 0, default: 0 },
  minStock: { type: Number, required: true, min: 0, default: 5 },
  unit: { type: String, enum: ['kg', 'g', 'L', 'ml', 'pcs'], default: 'kg' },
  costPerUnit: { type: Number, min: 0, default: 0 },
  lastRestocked: { type: Date, default: Date.now },
}, { timestamps: true });
schema.index({ franchiseId: 1, name: 1 });
module.exports = mongoose.model('FranchiseIngredient', schema);
