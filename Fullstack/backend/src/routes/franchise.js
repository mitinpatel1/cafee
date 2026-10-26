const express = require('express');
const mongoose = require('mongoose');
const Franchise = require('../models/Franchise');
const User = require('../models/User');
const Order = require('../models/Order');
const { protect, authorize } = require('../middleware/auth');
const { seedFranchiseMenu } = require('../services/seedMenu');

const router = express.Router();

// Public registration creates a franchise OWNER, never a service administrator.
// After registration the frontend returns to the customer website.
router.post('/register', async (req, res) => {
  try {
    const { ownerName, email, password, name, brandName, city, address, location, phone } = req.body;
    if (![ownerName, email, password, name, brandName, city, address, phone].every(v => typeof v === 'string' && v.trim()) || password.length < 8) {
      return res.status(400).json({ success: false, message: 'Please complete the franchise and owner details (password must be at least 8 characters).' });
    }
    const normalizedEmail = email.trim().toLowerCase();
    if (await User.exists({ email: normalizedEmail })) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    let owner, createdFranchise;
    try {
      owner = await User.create({ name: ownerName.trim(), email: normalizedEmail, password, phone, role: 'franchise' });
      const franchise = await Franchise.create({
        name: name.trim(), brandName: brandName.trim(), city: city.trim(),
        address: address.trim(), location: location?.trim() || '',
        phone: phone.trim(), email: normalizedEmail, ownerId: owner._id,
        status: 'Active',
      });
      createdFranchise = franchise;
      await seedFranchiseMenu(franchise._id);
      return res.status(201).json({ success: true, message: 'Franchise registered successfully.', franchise: { id: franchise._id, name: franchise.name } });
    } catch (e) {
      // Prevent an orphaned owner when saving the franchise fails.
      if (createdFranchise) {
        await require('../models/MenuItem').deleteMany({franchiseId:createdFranchise._id});
        await Franchise.deleteOne({_id:createdFranchise._id});
      }
      if (owner) await User.deleteOne({ _id: owner._id });
      throw e;
    }
  } catch (error) {
    res.status(error.code === 11000 ? 409 : 500).json({ success: false, message: error.code === 11000 ? 'Email already registered.' : 'Could not register franchise. Please verify your details.' });
  }
});

// Customer-facing branch selection: no owner details or private revenue data.
router.get('/public', async (_req, res) => {
  try {
    const franchises = await Franchise.find({ status: 'Active' }).select('name brandName city address location openTime closeTime').sort({ name: 1 });
    res.json({ success: true, franchises });
  } catch (_err) { res.status(500).json({ success: false, message: 'Unable to load franchises.' }); }
});

// Owner can ONLY read their own franchise(s).
router.get('/me', protect, authorize('franchise'), async (req, res) => {
  const franchises = await Franchise.find({ ownerId: req.user._id }).sort({ createdAt: -1 });
  res.json({ success: true, franchises });
});

router.get('/dashboard/stats', protect, authorize('franchise'), async (req, res) => {
  try {
    const franchises = await Franchise.find({ ownerId: req.user._id });
    const ids = franchises.map(f => f._id);
    const orders = await Order.find({ franchiseId: { $in: ids } }).select('total status paymentStatus createdAt');
    const paid = orders.filter(o => o.paymentStatus === 'Paid' && o.status !== 'Cancelled');
    const totalRevenue = paid.reduce((sum, o) => sum + o.total, 0);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    res.json({ success: true, stats: {
      totalFranchises: franchises.length,
      activeFranchises: franchises.filter(f => f.status === 'Active').length,
      totalOrders: orders.length,
      pendingOrders: orders.filter(o => o.status === 'Pending').length,
      completedOrders: orders.filter(o => o.status === 'Picked Up').length,
      todayOrders: orders.filter(o => o.createdAt >= today).length,
      totalRevenue,
      franchises,
    } });
  } catch (_err) { res.status(500).json({ success: false, message: 'Unable to fetch dashboard.' }); }
});

router.get('/orders', protect, authorize('franchise'), async (req, res) => {
  try {
    const franchises = await Franchise.find({ ownerId: req.user._id }).select('_id');
    const orders = await Order.find({ franchiseId: { $in: franchises.map(f => f._id) } })
      .populate('userId', 'name email phone')
      .populate('franchiseId', 'name city')
      .sort({ createdAt: -1 });
    res.json({ success: true, orders });
  } catch (_err) { res.status(500).json({ success: false, message: 'Unable to load franchise orders.' }); }
});

// Only service administrators can manage the whole franchise network.
router.get('/all', protect, authorize('admin'), async (_req, res) => {
  const franchises = await Franchise.find().populate('ownerId', 'name email').sort({ createdAt: -1 });
  res.json({ success: true, franchises });
});

router.patch('/:id/status', protect, authorize('admin'), async (req, res) => {
  if (!['Active', 'Inactive', 'Pending', 'Suspended'].includes(req.body.status)) return res.status(400).json({ success: false, message: 'Invalid franchise status.' });
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid franchise ID.' });
  const franchise = await Franchise.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true });
  if (!franchise) return res.status(404).json({ success: false, message: 'Franchise not found.' });
  res.json({ success: true, franchise });
});

module.exports = router;
