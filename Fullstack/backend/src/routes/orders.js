const express = require('express');
const Order = require('../models/Order');
const MenuItem = require('../models/MenuItem');
const Franchise = require('../models/Franchise');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ────────────────── POST /api/orders ──────────────────
// Create a new order (authenticated user)
router.post('/', protect, authorize('user', 'employee'), async (req, res) => {
  try {
    const { items, pickupTime, pickupCounter, paymentMethod, notes, franchiseId } = req.body;
    if (!['Counter Cash', 'Counter UPI', 'Online (Razorpay)'].includes(paymentMethod)) {
      return res.status(400).json({ success:false, message:'Choose counter cash, counter UPI or online payment.' });
    }
    if (paymentMethod === 'Online (Razorpay)' && !(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET)) {
      return res.status(503).json({success:false,message:'Online payment is not configured. Choose counter cash or UPI.'});
    }
    const franchise = await Franchise.findOne({ _id: franchiseId, status: 'Active' }).catch(() => null);
    if (!franchise) return res.status(400).json({ success: false, message: 'Select an active franchise to place your order.' });

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must have at least one item.' });
    }

    // Validate items and fetch current prices from DB
    const orderItems = [];
    let subtotal = 0;

    for (const cartItem of items) {
      if (!Number.isInteger(cartItem.quantity) || cartItem.quantity < 1 || cartItem.quantity > 50) {
        return res.status(400).json({ success: false, message: 'Item quantity must be between 1 and 50.' });
      }
      const menuItem = await MenuItem.findById(cartItem.menuItemId).catch(() => null);
      if (!menuItem) {
        return res.status(400).json({
          success: false,
          message: `Menu item not found: ${cartItem.menuItemId}`,
        });
      }
      if (String(menuItem.franchiseId) !== String(franchise._id)) return res.status(400).json({success:false,message:'Menu item does not belong to selected franchise.'});
      if (!menuItem.isAvailable) {
        return res.status(400).json({
          success: false,
          message: `${menuItem.name} is currently unavailable.`,
        });
      }

      const itemTotal = menuItem.price * cartItem.quantity;
      subtotal += itemTotal;

      orderItems.push({
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: cartItem.quantity,
        instructions: cartItem.instructions || '',
      });
    }

    const tax = Math.round(subtotal * 0.05); // 5% GST
    const total = subtotal + tax;

    const order = await Order.create({
      userId: req.user._id,
      franchiseId: franchise._id,
      items: orderItems,
      subtotal,
      tax,
      total,
      paymentMethod,
      paymentStatus: 'Pending',
      status: 'Pending',
      pickupTime: 'Awaiting service confirmation',
      pickupCounter: pickupCounter || 'Franchise pickup counter',
      notes: notes || '',
      estimatedReadyTime: null, // Service dashboard sets a real ETA
    });

    // Populate userId for the response
    await order.populate('userId', 'name email department');

    // Emit socket event for kitchen staff
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('new_order', order);
      io.to(`franchise_${franchise._id}`).emit('franchise_order_updated', order);
    }

    res.status(201).json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── GET /api/orders/my ──────────────────
// Get current user's orders
router.get('/my', protect, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('items.menuItemId', 'name image emoji');

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── GET /api/orders/admin/all ──────────────────
// Admin/Staff — get all orders with filters
router.get('/admin/all', protect, authorize('admin'), async (req, res) => {
  try {
    const { status, date } = req.query;
    const filter = {};

    if (status && status !== 'All') filter.status = status;

    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name email department')
      .populate('franchiseId','name city');

    res.json({ success: true, orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── GET /api/orders/:id ──────────────────
// Get a single order by ID
router.get('/:id', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('userId', 'name email department')
      .populate('items.menuItemId', 'name image emoji');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    // Only allow owner or admin/staff to view
    if (
      order.userId._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ success: false, message: 'Not authorized to view this order.' });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── PATCH /api/orders/:id/cancel ──────────────────
// Cancel an order (user or admin)
router.patch('/:id/cancel', protect, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }

    if (order.userId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You cannot cancel another customer’s order.' });
    }

    if (order.paymentStatus === 'Paid') return res.status(409).json({success:false,message:'Paid orders need a manual refund process. Contact service support.'});
    // Only allow cancel if Pending or Confirmed
    if (!['Pending', 'Confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel order with status "${order.status}".`,
      });
    }

    order.status = 'Cancelled';
    order.cancelReason = req.body.reason || 'Cancelled by user';


    await order.save();

    // Emit socket event
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.userId}`).emit('order_status_updated', {
        orderId: order._id,
        status: order.status,
        order,
      });
      io.to(`franchise_${order.franchiseId}`).emit('franchise_order_updated',order);
      io.to('kitchen').emit('order_status_updated', {
        orderId: order._id,
        status: order.status,
        order,
      });
    }

    res.json({ success: true, order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ────────────────── PATCH /api/orders/admin/:id/status ──────────────────
// Admin/Staff — update order status
router.patch('/admin/:id/status', protect, authorize('admin'), async (req,res) => {
  try {
    const { status, readyInMinutes } = req.body;
    const allowedNext = {
      Pending: ['Confirmed','Cancelled'], Confirmed: ['Preparing','Cancelled'],
      Preparing: ['Ready'], Ready: ['Picked Up'],
    };
    const order = await Order.findById(req.params.id).populate('userId','name email');
    if (!order) return res.status(404).json({success:false,message:'Order not found.'});
    if (!allowedNext[order.status]?.includes(status)) return res.status(400).json({success:false,message:`Cannot change ${order.status} to ${status}.`});
    if (order.paymentMethod === 'Online (Razorpay)' && order.paymentStatus !== 'Paid' && status !== 'Cancelled')
      return res.status(400).json({success:false,message:'Online payment has not been verified yet.'});
    if (status === 'Picked Up' && order.paymentStatus !== 'Paid')
      return res.status(400).json({success:false,message:'Confirm counter payment before handing over the order.'});
    if (status === 'Confirmed' || status === 'Preparing') {
      const mins = Number(readyInMinutes);
      if (!Number.isInteger(mins) || mins < 1 || mins > 180) return res.status(400).json({success:false,message:'Set preparation time from 1 to 180 minutes.'});
      order.readyInMinutes = mins;
      order.estimatedReadyTime = new Date(Date.now() + mins * 60000);
      order.pickupTime = `Ready in about ${mins} minutes`;
    }
    if (status === 'Ready') { order.estimatedReadyTime = new Date(); order.readyInMinutes = 0; order.pickupTime = 'Ready for pickup'; }
    if (status === 'Picked Up') order.pickupTime = 'Collected';
    order.status = status;
    await order.save();
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.userId._id}`).to(`order_${order._id}`).emit('order_status_updated', {orderId:order._id,status:order.status,order});
      io.to(`order_${order._id}`).emit('order_tracking_update', {orderId:order._id,status:order.status,eta:order.estimatedReadyTime,message:getStatusMessage(status),timestamp:new Date().toISOString(),orderNumber:order.orderNumber});
      io.to('kitchen').emit('order_status_updated', {orderId:order._id,status:order.status,order});
      io.to(`franchise_${order.franchiseId}`).emit('franchise_order_updated', order);
    }
    res.json({success:true,order});
  } catch (e) { res.status(500).json({success:false,message:'Order update failed.'}); }
});

// Service dashboard records payment physically received at counter; this is NOT an online payment verification.
router.patch('/admin/:id/counter-payment', protect, authorize('admin'), async (req,res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) return res.status(404).json({success:false,message:'Order not found.'});
    if (!['Counter Cash','Counter UPI','Cash on Pickup'].includes(order.paymentMethod) || order.status === 'Cancelled')
      return res.status(400).json({success:false,message:'Only counter payments can be recorded here.'});
    if (order.paymentStatus === 'Paid') return res.json({success:true,order});
    // Optional UPI transaction reference entered by service operator; do not confuse with gateway verification.
    if (order.paymentMethod === 'Counter UPI' && (!req.body.reference || String(req.body.reference).trim().length < 4))
      return res.status(400).json({success:false,message:'Enter the counter UPI transaction reference.'});
    order.counterPaymentReference = String(req.body.reference || '').slice(0,120);
    order.paymentStatus = 'Paid';
    await order.save();
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${order.userId}`).to(`order_${order._id}`).emit('order_status_updated',{orderId:order._id,status:order.status,order});
      io.to('kitchen').emit('order_status_updated',{orderId:order._id,status:order.status,order});
      io.to(`franchise_${order.franchiseId}`).emit('franchise_order_updated',order);
    }
    res.json({success:true,order});
  } catch(e) {res.status(500).json({success:false,message:'Unable to record counter payment.'});}
});

function getStatusMessage(status) {
  const messages = {
    Pending: 'Your order has been received and is waiting for confirmation.',
    Confirmed: 'Your order has been confirmed! The kitchen will start preparing it soon.',
    Preparing: 'Your order is being prepared by the chef. Almost there!',
    Ready: '🎉 Your order is ready for pickup! Head to the counter.',
    'Picked Up': 'Order picked up. Enjoy your meal!',
    Cancelled: 'This order has been cancelled.',
  };
  return messages[status] || 'Order updated.';
}

module.exports = router;
