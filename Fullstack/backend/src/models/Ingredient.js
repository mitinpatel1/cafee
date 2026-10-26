const mongoose = require('mongoose');

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['Vegetables', 'Dairy', 'Grains', 'Spices', 'Meat', 'Beverages', 'Packaging', 'Other'],
      default: 'Other',
    },
    currentStock: { type: Number, default: 0 },
    unit: { type: String, default: 'kg' },
    minStock: { type: Number, default: 5 },
    costPerUnit: { type: Number, default: 0 },
    supplier: { type: String, default: '' },
    lastRestocked: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ingredient', ingredientSchema);
