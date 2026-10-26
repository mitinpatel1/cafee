const express = require('express');
const mongoose = require('mongoose');
const MenuItem = require('../models/MenuItem');
const DailyMenuCatalogItem = require('../models/DailyMenuCatalogItem');
const Franchise = require('../models/Franchise');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();

async function ownedFranchise(user, franchiseId) {
  if (!mongoose.isValidObjectId(franchiseId)) return null;
  return Franchise.findOne({ _id: franchiseId, ownerId: user._id });
}
async function authorizeItem(req, res, next) {
  const item = mongoose.isValidObjectId(req.params.id) ? await MenuItem.findById(req.params.id) : null;
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });
  if (req.user.role !== 'franchise' || !await ownedFranchise(req.user, item.franchiseId))
    return res.status(403).json({ success: false, message: 'You can edit only your own franchise menu.' });
  req.menuItem = item;
  next();
}

function menuFilter(query) {
  const filter = {};
  if (query.category && query.category !== 'All' && query.category !== 'All Items') filter.category = query.category;
  if (query.vegOnly === 'true') filter.isVeg = true;
  if (query.isAvailable !== undefined) filter.isAvailable = query.isAvailable === 'true';
  if (query.search) {
    const pattern = String(query.search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    filter.$or = [{ name: new RegExp(pattern, 'i') }, { description: new RegExp(pattern, 'i') }];
  }
  return filter;
}

// GET /api/menu: live branch menu when available; otherwise published DB catalogue.
// Preview is non-orderable and never used to create an order.
router.get('/', async (req, res) => {
  try {
    let franchise;
    if (req.query.franchiseId) {
      if (!mongoose.isValidObjectId(req.query.franchiseId)) {
        return res.status(400).json({ success: false, message: 'Invalid franchise selection.' });
      }
      franchise = await Franchise.findOne({ _id: req.query.franchiseId, status: 'Active' });
      if (!franchise) return res.status(404).json({ success: false, message: 'Selected franchise is unavailable.' });
    } else {
      franchise = await Franchise.findOne({ status: 'Active' }).sort({ createdAt: 1 });
    }
    const filter = menuFilter(req.query);
    if (!franchise) {
      const items = await DailyMenuCatalogItem.find(filter).sort({ category: 1, name: 1 }).lean();
      return res.json({ success: true, items: items.map(item => ({ ...item, catalogPreview: true })), count: items.length, catalogPreview: true, franchiseId: null });
    }
    const items = await MenuItem.find({ ...filter, franchiseId: franchise._id }).sort({ category: 1, isPopular: -1, name: 1 });
    return res.json({ success: true, items, count: items.length, catalogPreview: false, franchiseId: franchise._id });
  } catch (error) {
    console.error('Menu request failed:', error.message);
    return res.status(500).json({ success: false, message: 'Unable to load menu.' });
  }
});

// Explicit read-only, database-backed starter menu for diagnostics / preview.
router.get('/catalog', async (_req, res) => {
  try {
    const items = await DailyMenuCatalogItem.find().sort({ category: 1, name: 1 }).lean();
    return res.json({ success: true, count: items.length, items: items.map(item => ({ ...item, catalogPreview: true })) });
  } catch (_error) {
    return res.status(500).json({ success: false, message: 'Unable to load daily catalogue.' });
  }
});

router.get('/:id', async (req, res) => {
  const item = mongoose.isValidObjectId(req.params.id) ? await MenuItem.findById(req.params.id) : null;
  if (!item) return res.status(404).json({ success: false, message: 'Menu item not found.' });
  return res.json({ success: true, item });
});
router.post('/', protect, authorize('franchise'), async (req, res) => {
  try {
    const franchise = await ownedFranchise(req.user, req.body.franchiseId);
    if (!franchise) return res.status(403).json({ success: false, message: 'Select your own franchise.' });
    const { name, description, price, category, image, isVeg, isAvailable, preparationTime } = req.body;
    const item = await MenuItem.create({ franchiseId: franchise._id, name, description, price, category, image, isVeg, isAvailable, preparationTime });
    return res.status(201).json({ success: true, item });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
router.patch('/:id', protect, authorize('franchise'), authorizeItem, async (req, res) => {
  try {
    const allowed = ['name', 'description', 'price', 'category', 'image', 'isVeg', 'isAvailable', 'preparationTime'];
    for (const key of allowed) if (Object.hasOwn(req.body, key)) req.menuItem[key] = req.body[key];
    await req.menuItem.save();
    return res.json({ success: true, item: req.menuItem });
  } catch (error) {
    return res.status(400).json({ success: false, message: error.message });
  }
});
router.patch('/:id/toggle', protect, authorize('franchise'), authorizeItem, async (req, res) => {
  req.menuItem.isAvailable = !req.menuItem.isAvailable;
  await req.menuItem.save();
  return res.json({ success: true, item: req.menuItem });
});
router.delete('/:id', protect, authorize('franchise'), authorizeItem, async (req, res) => {
  await req.menuItem.deleteOne();
  return res.json({ success: true, message: 'Menu item removed.' });
});
module.exports = router;
