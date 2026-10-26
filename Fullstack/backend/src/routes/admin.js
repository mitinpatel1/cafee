const express = require('express');
const Ingredient = require('../models/Ingredient');
const Order = require('../models/Order');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ═══════════════════════════════════════════════════════
// INVENTORY ROUTES — /api/admin/inventory
// ═══════════════════════════════════════════════════════

// ────────────────── GET /api/admin/inventory ──────────────────
router.get('/inventory', protect, authorize('admin'), async (req, res) => {
  try {
    const ingredients = await Ingredient.find().sort({ category: 1, name: 1 });
    res.json({ success: true, ingredients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── POST /api/admin/inventory ──────────────────
router.post('/inventory', protect, authorize('admin'), async (req, res) => {
  try {
    const ingredient = await Ingredient.create(req.body);
    res.status(201).json({ success: true, ingredient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── PATCH /api/admin/inventory/:id/stock ──────────────────
router.patch('/inventory/:id/stock', protect, authorize('admin'), async (req, res) => {
  try {
    const { currentStock, action, quantity } = req.body;
    const ingredient = await Ingredient.findById(req.params.id);

    if (!ingredient) {
      return res.status(404).json({ success: false, message: 'Ingredient not found.' });
    }

    if (currentStock !== undefined) {
      ingredient.currentStock = currentStock;
    } else if (action === 'add' && quantity) {
      ingredient.currentStock += quantity;
    } else if (action === 'remove' && quantity) {
      ingredient.currentStock = Math.max(0, ingredient.currentStock - quantity);
    }

    ingredient.lastRestocked = new Date();
    await ingredient.save();

    res.json({ success: true, ingredient });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── DELETE /api/admin/inventory/:id ──────────────────
router.delete('/inventory/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const ingredient = await Ingredient.findByIdAndDelete(req.params.id);
    if (!ingredient) {
      return res.status(404).json({ success: false, message: 'Ingredient not found.' });
    }
    res.json({ success: true, message: 'Ingredient deleted.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ═══════════════════════════════════════════════════════
// REPORTS ROUTE — /api/admin/reports
// ═══════════════════════════════════════════════════════

// ────────────────── GET /api/admin/reports ──────────────────
router.get('/reports', protect, authorize('admin'), async (req, res) => {
  try {
    // Date ranges
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Today's stats
    const todayOrders = await Order.find({
      createdAt: { $gte: today, $lt: tomorrow },
      status: { $ne: 'Cancelled' },
    });

    const todayRevenue = todayOrders.filter(o=>o.paymentStatus==='Paid').reduce((sum, o) => sum + o.total, 0);
    const todayOrderCount = todayOrders.length;

    // Weekly stats
    const weekOrders = await Order.find({
      createdAt: { $gte: weekAgo },
      status: { $ne: 'Cancelled' },
    });
    const weekRevenue = weekOrders.filter(o=>o.paymentStatus==='Paid').reduce((sum, o) => sum + o.total, 0);

    // Monthly stats
    const monthOrders = await Order.find({
      createdAt: { $gte: monthAgo },
      status: { $ne: 'Cancelled' },
    });
    const monthRevenue = monthOrders.filter(o=>o.paymentStatus==='Paid').reduce((sum, o) => sum + o.total, 0);

    // Total users
    const totalUsers = await User.countDocuments();

    // Total menu items
    const totalMenuItems = await MenuItem.countDocuments();
    const availableMenuItems = await MenuItem.countDocuments({ isAvailable: true });

    // Popular items (aggregate from orders)
    const popularItems = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' }, createdAt: { $gte: monthAgo } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.name', totalOrdered: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } } } },
      { $sort: { totalOrdered: -1 } },
      { $limit: 10 },
    ]);

    // Orders by status
    const ordersByStatus = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Revenue by payment method
    const revenueByPayment = await Order.aggregate([
      { $match: { status: { $ne: 'Cancelled' }, paymentStatus: 'Paid' } },
      { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } },
    ]);

    // Daily revenue for last 7 days
    const dailyRevenue = [];
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() - i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const dayOrders = await Order.find({
        createdAt: { $gte: dayStart, $lt: dayEnd },
        status: { $ne: 'Cancelled' },
      });

      dailyRevenue.push({
        date: dayStart.toISOString().split('T')[0],
        day: dayStart.toLocaleDateString('en-US', { weekday: 'short' }),
        revenue: dayOrders.filter(o=>o.paymentStatus==='Paid').reduce((sum, o) => sum + o.total, 0),
        orders: dayOrders.length,
      });
    }

    // Low stock alerts
    const lowStockItems = await require('../models/Ingredient').find({
      $expr: { $lte: ['$currentStock', '$minStock'] },
    });

    res.json({
      success: true,
      reports: {
        today: { revenue: todayRevenue, orders: todayOrderCount },
        week: { revenue: weekRevenue, orders: weekOrders.length },
        month: { revenue: monthRevenue, orders: monthOrders.length },
        totalUsers,
        totalMenuItems,
        availableMenuItems,
        popularItems,
        ordersByStatus,
        revenueByPayment,
        dailyRevenue,
        lowStockAlerts: lowStockItems.length,
        lowStockItems,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
