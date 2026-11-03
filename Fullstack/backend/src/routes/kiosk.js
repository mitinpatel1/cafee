const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const Franchise = require('../models/Franchise');
const MenuItem = require('../models/MenuItem');
const {isInsideWindow} = require('../utils/menuSchedule');
const { listSeats, assignSeatByCustomer } = require('../services/seatService');

const router = express.Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const configured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
const qrConfigured = () => configured() && process.env.ENABLE_UPI_QR === 'true';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const money = amount => Math.round(amount * 100) / 100;
const paise = rupees => Math.round(Number(rupees) * 100);

// Basic per-process protection for public endpoints. Use a shared rate limiter
// (e.g. Redis / reverse proxy) before exposing kiosks to the public internet.
const requestWindows = new Map();
function throttle(limit, periodMs) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path.startsWith('/orders') ? 'order' : 'tracking'}`;
    const now = Date.now();
    const current = requestWindows.get(key);
    const record = !current || now - current.start > periodMs
      ? { start: now, count: 0 } : current;
    record.count += 1;
    requestWindows.set(key, record);
    if (requestWindows.size > 10000) {
      for (const [k,v] of requestWindows) { if (now - v.start > periodMs) requestWindows.delete(k); }
      if (requestWindows.size > 10000) requestWindows.clear();
    }
    if (record.count > limit) return res.status(429).json({ success: false, message: 'Too many requests. Please try shortly.' });
    next();
  };
}

function matchingSignature(expected, received) {
  return typeof received === 'string' && /^[0-9a-f]{64}$/i.test(received) &&
    crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
}
function publicOrder(order) {
  return {
    orderNumber: order.orderNumber,
    trackingCode: order.trackingCode,
    status: order.status,
    paymentStatus: order.paymentStatus,
    seatNumber: order.seatNumber || null,
    seatPending: order.paymentStatus === 'Paid' && !order.seatNumber && !['Picked Up', 'Cancelled'].includes(order.status),
    pickupTime: order.pickupTime,
    estimatedReadyTime: order.estimatedReadyTime,
  };
}
function notify(req, order) {
  const io = req.app.get('io');
  if (!io) return;
  io.to('kitchen').emit('order_status_updated', { orderId: order._id, status: order.status, paymentStatus: order.paymentStatus, seatNumber: order.seatNumber, order });
  io.to(`order_${order._id}`).emit('order_tracking_update', { orderId: order._id, status: order.status, paymentStatus: order.paymentStatus, seatNumber: order.seatNumber });
  io.to(`franchise_${order.franchiseId}`).emit('franchise_order_updated', order);
}
async function razorpay(path, method = 'GET', body) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method,
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.description || 'Razorpay request failed');
  return data;
}

async function ownedGuestOrder(req, res, next) {
  try {
    const token = req.get('x-kiosk-order-key') || '';
    if (!/^[a-f0-9]{64}$/i.test(token)) return res.status(403).json({ success: false, message: 'Invalid order key.' });
    const order = await Order.findById(req.params.id).select('+guestTokenHash').catch(() => null);
    if (!order || !order.isGuestOrder || !order.guestTokenHash || !matchingSignature(order.guestTokenHash, hash(token))) {
      return res.status(404).json({ success: false, message: 'Order not found.' });
    }
    req.guestOrder = order;
    next();
  } catch (error) { next(error); }
}

// No customer account, signup, OTP, email or JWT required.
router.post('/orders', throttle(120, 5 * 60 * 1000), async (req, res) => {
  try {
    const { franchiseId, items, paymentMethod, notes } = req.body;
    if (!['Online (Razorpay)', 'Counter Cash', 'Counter UPI'].includes(paymentMethod)) {
      return res.status(400).json({ success: false, message: 'Choose a payment method.' });
    }
    if (paymentMethod === 'Online (Razorpay)' && !configured()) {
      return res.status(503).json({ success: false, message: 'Online payment is not configured.' });
    }
    const franchise = await Franchise.findOne({ _id: franchiseId, status: 'Active' }).catch(() => null);
    if (!franchise) return res.status(400).json({ success: false, message: 'Select an active franchise.' });
    if (!Array.isArray(items) || items.length === 0 || items.length > 30) {
      return res.status(400).json({ success: false, message: 'Cart must contain 1–30 items.' });
    }
    let subtotal = 0;
    const orderItems = [];
    for (const item of items) {
      if (!item || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) {
        return res.status(400).json({ success: false, message: 'Invalid item quantity.' });
      }
      const menuItem = await MenuItem.findById(item.menuItemId).catch(() => null);
      if (!menuItem || !menuItem.isAvailable || !isInsideWindow(menuItem) || String(menuItem.franchiseId) !== String(franchise._id)) {
        return res.status(400).json({ success: false, message: 'One or more menu items are unavailable.' });
      }
      subtotal += menuItem.price * item.quantity;
      orderItems.push({ menuItemId: menuItem._id, name: menuItem.name, price: menuItem.price, quantity: item.quantity, instructions: String(item.instructions || '').slice(0, 200) });
    }
    subtotal = money(subtotal);
    if (!Number.isSafeInteger(paise(subtotal)) || subtotal <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid order total.' });
    }
    const orderKey = crypto.randomBytes(32).toString('hex');
    const order = await Order.create({
      userId: null,
      isGuestOrder: true,
      guestTokenHash: hash(orderKey),
      trackingCode: crypto.randomBytes(8).toString('hex').toUpperCase(),
      franchiseId: franchise._id,
      items: orderItems,
      subtotal, tax: 0, total: subtotal,
      paymentMethod,
      paymentStatus: 'Pending',
      status: 'Pending',
      notes: String(notes || '').slice(0, 500),
      pickupCounter: 'Main counter',
      pickupTime: 'Awaiting payment',
      seatNumber: null,
    });
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('new_order', order);
      io.to(`franchise_${order.franchiseId}`).emit('franchise_order_updated', order);
    }
    res.status(201).json({ success: true, order: { _id: order._id, ...publicOrder(order), total: order.total }, orderKey });
  } catch (error) { console.error('Kiosk order creation:', error); res.status(500).json({ success: false, message: 'Unable to place order.' }); }
});

router.get('/config', (_req, res) => res.json({ success: true, onlineEnabled: configured(), qrEnabled: qrConfigured() }));

// Tracking code is displayed on the customer screen. Only non-sensitive status is returned.
router.get('/track/:code', throttle(90, 5 * 60 * 1000), async (req, res) => {
  const code = String(req.params.code || '').trim().toUpperCase();
  if (!/^[0-9A-F]{16}$/.test(code)) return res.status(400).json({ success: false, message: 'Invalid tracking code.' });
  const order = await Order.findOne({ trackingCode: code, isGuestOrder: true });
  if (!order) return res.status(404).json({ success: false, message: 'Tracking code not found.' });
  res.json({ success: true, order: publicOrder(order) });
});


// Payment capture is rechecked with Razorpay before telling the kiosk to reset.
// Never accept a claimed client-side paid status as proof of payment.
async function reconcileGatewayPayment(req, order) {
  if (order.paymentStatus === 'Paid' || !configured()) return order;
  const candidates = await Payment.find({ orderId: order._id, status: { $in: ['Initiated','Processing','Completed'] } }).sort({createdAt:-1}).limit(10);
  for (const record of candidates) {
    let collection;
    if (record.gatewayQrId) {
      collection = await razorpay(`payments/qr_codes/${encodeURIComponent(record.gatewayQrId)}/payments?count=100`);
    } else if (record.gatewayOrderId) {
      collection = await razorpay(`orders/${encodeURIComponent(record.gatewayOrderId)}/payments`);
    } else continue;
    const match = (collection.items || []).find(payment =>
      payment.status === 'captured' && payment.currency === 'INR' &&
      payment.amount === paise(order.total) && payment.id &&
      (!record.gatewayQrId || payment.method === 'upi') &&
      (!record.gatewayOrderId || payment.order_id === record.gatewayOrderId) &&
      (!record.transactionId || record.transactionId === payment.id)
    );
    if (!match) continue;
    await Payment.updateOne({ _id: record._id, status: { $ne:'Refunded' } }, {
      $set: {status:'Completed',transactionId:match.id}
    });
    await Order.updateOne({ _id:order._id,paymentStatus:'Pending' }, { $set:{paymentStatus:'Paid'} });
    const updated = await Order.findById(order._id);
    notify(req, updated);
    return updated;
  }
  return order;
}

// Authenticated reconciliation endpoint, used after refresh and on payment timeout.
router.get('/orders/:id/recover', throttle(90, 5 * 60 * 1000), ownedGuestOrder, async (req,res) => {
  try {
    const updated = await reconcileGatewayPayment(req, req.guestOrder);
    return res.json({ success:true, order:publicOrder(updated), paymentVerified:updated.paymentStatus === 'Paid', gatewayChecked:configured() });
  } catch (error) {
    console.error('Payment reconciliation:', error.message);
    return res.status(503).json({ success:false, message:'Payment provider is unavailable. Keep the order active and retry.' });
  }
});

// Razorpay-backed unique fixed-amount UPI QR, only if ENABLE_UPI_QR=true.
// Provider requires at least 2 minutes to expire a single-use QR; kiosk
// must not clear this order after 60 seconds when a QR is active.
router.post('/orders/:id/upi-qr', throttle(60, 5 * 60 * 1000), ownedGuestOrder, async (req,res) => {
  try {
    const order = req.guestOrder;
    if (!qrConfigured()) return res.status(503).json({success:false,message:'UPI QR is not enabled for this Razorpay account.'});
    if (order.paymentMethod !== 'Counter UPI' || order.status !== 'Pending' || order.paymentStatus !== 'Pending') {
      return res.status(409).json({success:false,message:'Order is not eligible for UPI QR.'});
    }
    let payment = await Payment.findOne({orderId:order._id,gatewayQrId:{$ne:''},status:{$in:['Initiated','Processing']}}).sort({createdAt:-1});
    const now = Date.now();
    if (payment?.gatewayQrId && payment.gatewayQrCloseBy?.getTime() > now + 15000) {
      return res.json({success:true,imageUrl:payment.gatewayQrImage,closeBy:payment.gatewayQrCloseBy,amount:paise(order.total)});
    }
    const qr = await razorpay('payments/qr_codes','POST',{
      type:'upi_qr',usage:'single_use',fixed_amount:true,
      payment_amount:paise(order.total),name:`OfficeBite ${order.orderNumber}`.slice(0,60),
      description:'Cafeteria guest order payment',
      close_by:Math.floor(Date.now()/1000)+180,
      notes:{officebiteOrderId:String(order._id)}
    });
    if (!qr.id || !/^https:\/\//.test(qr.image_url || '')) throw new Error('QR provider did not return a valid image.');
    payment = await Payment.create({
      orderId:order._id,userId:null,amount:order.total,paymentMethod:'Counter UPI',
      status:'Initiated',paymentId:`KIOSKQR-${crypto.randomBytes(10).toString('hex')}`,
      gatewayQrId:qr.id,gatewayQrImage:qr.image_url,
      gatewayQrCloseBy:new Date(Number(qr.close_by)*1000)
    });
    return res.json({success:true,imageUrl:payment.gatewayQrImage,closeBy:payment.gatewayQrCloseBy,amount:paise(order.total)});
  } catch (error) {
    console.error('UPI QR creation:',error.message);
    return res.status(502).json({success:false,message:'Could not generate verified UPI QR. Use counter payment instead.'});
  }
});


// Payment capture is rechecked with Razorpay before telling the kiosk to reset.
// Never accept a claimed client-side paid status as proof of payment.
async function reconcileGatewayPayment(req, order) {
  if (order.paymentStatus === 'Paid' || !configured()) return order;
  const candidates = await Payment.find({ orderId: order._id, status: { $in: ['Initiated','Processing','Completed'] } }).sort({createdAt:-1}).limit(10);
  for (const record of candidates) {
    let collection;
    if (record.gatewayQrId) {
      collection = await razorpay(`payments/qr_codes/${encodeURIComponent(record.gatewayQrId)}/payments?count=100`);
    } else if (record.gatewayOrderId) {
      collection = await razorpay(`orders/${encodeURIComponent(record.gatewayOrderId)}/payments`);
    } else continue;
    const match = (collection.items || []).find(payment =>
      payment.status === 'captured' && payment.currency === 'INR' &&
      payment.amount === paise(order.total) && payment.id &&
      (!record.gatewayQrId || payment.method === 'upi') &&
      (!record.gatewayOrderId || payment.order_id === record.gatewayOrderId) &&
      (!record.transactionId || record.transactionId === payment.id)
    );
    if (!match) continue;
    await Payment.updateOne({ _id: record._id, status: { $ne:'Refunded' } }, {
      $set: {status:'Completed',transactionId:match.id}
    });
    await Order.updateOne({ _id:order._id,paymentStatus:'Pending' }, { $set:{paymentStatus:'Paid'} });
    const updated = await Order.findById(order._id);
    notify(req, updated);
    return updated;
  }
  return order;
}

// Authenticated reconciliation endpoint, used after refresh and on payment timeout.
router.get('/orders/:id/recover', throttle(90, 5 * 60 * 1000), ownedGuestOrder, async (req,res) => {
  try {
    const updated = await reconcileGatewayPayment(req, req.guestOrder);
    return res.json({ success:true, order:publicOrder(updated), paymentVerified:updated.paymentStatus === 'Paid', gatewayChecked:configured() });
  } catch (error) {
    console.error('Payment reconciliation:', error.message);
    return res.status(503).json({ success:false, message:'Payment provider is unavailable. Keep the order active and retry.' });
  }
});

// Razorpay-backed unique fixed-amount UPI QR, only if ENABLE_UPI_QR=true.
// Provider requires at least 2 minutes to expire a single-use QR; kiosk
// must not clear this order after 60 seconds when a QR is active.
router.post('/orders/:id/upi-qr', throttle(60, 5 * 60 * 1000), ownedGuestOrder, async (req,res) => {
  try {
    const order = req.guestOrder;
    if (!qrConfigured()) return res.status(503).json({success:false,message:'UPI QR is not enabled for this Razorpay account.'});
    if (order.paymentMethod !== 'Counter UPI' || order.status !== 'Pending' || order.paymentStatus !== 'Pending') {
      return res.status(409).json({success:false,message:'Order is not eligible for UPI QR.'});
    }
    let payment = await Payment.findOne({orderId:order._id,gatewayQrId:{$ne:''},status:{$in:['Initiated','Processing']}}).sort({createdAt:-1});
    const now = Date.now();
    if (payment?.gatewayQrId && payment.gatewayQrCloseBy?.getTime() > now + 15000) {
      return res.json({success:true,imageUrl:payment.gatewayQrImage,closeBy:payment.gatewayQrCloseBy,amount:paise(order.total)});
    }
    const qr = await razorpay('payments/qr_codes','POST',{
      type:'upi_qr',usage:'single_use',fixed_amount:true,
      payment_amount:paise(order.total),name:`OfficeBite ${order.orderNumber}`.slice(0,60),
      description:'Cafeteria guest order payment',
      close_by:Math.floor(Date.now()/1000)+180,
      notes:{officebiteOrderId:String(order._id)}
    });
    if (!qr.id || !/^https:\/\//.test(qr.image_url || '')) throw new Error('QR provider did not return a valid image.');
    payment = await Payment.create({
      orderId:order._id,userId:null,amount:order.total,paymentMethod:'Counter UPI',
      status:'Initiated',paymentId:`KIOSKQR-${crypto.randomBytes(10).toString('hex')}`,
      gatewayQrId:qr.id,gatewayQrImage:qr.image_url,
      gatewayQrCloseBy:new Date(Number(qr.close_by)*1000)
    });
    return res.json({success:true,imageUrl:payment.gatewayQrImage,closeBy:payment.gatewayQrCloseBy,amount:paise(order.total)});
  } catch (error) {
    console.error('UPI QR creation:',error.message);
    return res.status(502).json({success:false,message:'Could not generate verified UPI QR. Use counter payment instead.'});
  }
});

// Available seats can be viewed only by the guest who created this order,
// and ONLY once their payment is verified by the server.
router.get('/orders/:id/seats', ownedGuestOrder, async (req, res) => {
  try {
    const order = await Order.findById(req.guestOrder._id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' });
    if (order.paymentStatus !== 'Paid') {
      return res.status(403).json({ success: false, message: 'Complete payment before choosing a seat.' });
    }
    if (['Cancelled', 'Picked Up'].includes(order.status)) {
      return res.status(409).json({ success: false, message: 'This order is already closed.' });
    }
    const seats = await listSeats(order.franchiseId);
    return res.json({ success: true, ...seats, selectedSeat: order.seatNumber || null });
  } catch (error) {
    console.error('Kiosk available seats:', error);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Could not load available seats.' });
  }
});

// A customer chooses a specific free seat after successful payment.
// x-kiosk-order-key prevents another visitor from taking over their order.
router.post('/orders/:id/seat', throttle(90, 5 * 60 * 1000), ownedGuestOrder, async (req, res) => {
  try {
    const order = await assignSeatByCustomer(req.guestOrder._id, req.body?.seatNumber);
    notify(req, order);
    return res.json({ success: true, order: publicOrder(order), message: `Seat ${order.seatNumber} confirmed.` });
  } catch (error) {
    console.error('Customer seat selection:', error);
    return res.status(error.status || 500).json({ success: false, message: error.status ? error.message : 'Could not confirm your seat.' });
  }
});

router.post('/orders/:id/pay', ownedGuestOrder, async (req, res) => {
  try {
    const order = req.guestOrder;
    if (!configured()) return res.status(503).json({ success: false, message: 'Razorpay is not configured.' });
    if (order.paymentMethod !== 'Online (Razorpay)' || order.status === 'Cancelled' || order.paymentStatus === 'Paid') {
      return res.status(409).json({ success: false, message: 'Order is not eligible for online payment.' });
    }
    let payment = await Payment.findOne({ orderId: order._id, status: { $in: ['Initiated', 'Processing'] } }).sort({ createdAt: -1 });
    if (!payment) {
      const gatewayOrder = await razorpay('orders', 'POST', {
        amount: paise(order.total), currency: 'INR', receipt: order.orderNumber.slice(0, 40),
        notes: { officebiteOrderId: String(order._id) },
      });
      payment = await Payment.create({
        orderId: order._id, userId: null, amount: order.total,
        paymentMethod: order.paymentMethod, status: 'Initiated',
        paymentId: `KIOSK-${crypto.randomBytes(10).toString('hex')}`,
        gatewayOrderId: gatewayOrder.id,
      });
    }
    res.json({ success: true, keyId: process.env.RAZORPAY_KEY_ID, gatewayOrderId: payment.gatewayOrderId, amount: paise(order.total), currency: 'INR' });
  } catch (error) { console.error('Kiosk payment initiate:', error); res.status(502).json({ success: false, message: 'Could not initiate payment.' }); }
});

router.post('/orders/:id/verify', ownedGuestOrder, async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every(v => typeof v === 'string')) {
      return res.status(400).json({ success: false, message: 'Missing payment data.' });
    }
    const order = req.guestOrder;
    const payment = await Payment.findOne({ orderId: order._id, gatewayOrderId: razorpay_order_id });
    if (!payment || order.paymentMethod !== 'Online (Razorpay)') return res.status(403).json({ success: false, message: 'Payment mismatch.' });
    const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(`${payment.gatewayOrderId}|${razorpay_payment_id}`).digest('hex');
    if (!matchingSignature(expected, razorpay_signature)) return res.status(403).json({ success: false, message: 'Invalid payment signature.' });
    const captured = await razorpay(`payments/${encodeURIComponent(razorpay_payment_id)}`);
    if (captured.status !== 'captured' || captured.order_id !== payment.gatewayOrderId || captured.currency !== 'INR' || captured.amount !== paise(order.total)) {
      return res.status(409).json({ success: false, message: 'Payment capture is pending. Check status before retrying.' });
    }
    if (payment.transactionId && payment.transactionId !== captured.id) {
      return res.status(409).json({ success: false, message: 'Payment transaction mismatch.' });
    }
    await Payment.updateOne({ _id: payment._id, status: { $ne: 'Completed' } }, { $set: { status: 'Completed', transactionId: captured.id } });
    await Order.updateOne({ _id: order._id, paymentStatus: { $ne: 'Paid' } }, { $set: { paymentStatus: 'Paid' } });

    // Seat selection is unlocked after server-side payment verification.
    const updated = await Order.findById(order._id);
    notify(req, updated);
    res.json({
      success: true,
      order: publicOrder(updated),
      message: 'Payment successful. Please choose an available seat.',
    });
  } catch (error) { console.error('Kiosk payment verify:', error); res.status(502).json({ success: false, message: 'Unable to confirm payment. Please check the tracking code.' }); }
});

// Call this from Razorpay's payment.captured webhook for server-to-server recovery.
// In app.js raw-body middleware must come BEFORE express.json().
router.post('/razorpay/webhook', async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret || !Buffer.isBuffer(req.body)) return res.status(503).json({ success: false });
    const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    if (!matchingSignature(expected, req.get('x-razorpay-signature'))) return res.status(401).json({ success: false });
    const event = JSON.parse(req.body.toString('utf8'));
    if (!['payment.captured','qr_code.credited'].includes(event.event)) return res.json({ success: true });
    const captured = event.payload?.payment?.entity;
    if (!captured || captured.currency !== 'INR' || captured.status !== 'captured') return res.status(400).json({ success: false });
    const qrId = event.event === 'qr_code.credited' ? event.payload?.qr_code?.entity?.id : null;
    const payment = qrId ? await Payment.findOne({gatewayQrId:qrId}) : await Payment.findOne({gatewayOrderId:captured.order_id});
    if (!payment) return res.json({ success: true, ignored: true });
    const order = await Order.findById(payment.orderId);
    if (!order || !['Online (Razorpay)','Counter UPI'].includes(order.paymentMethod) || payment.amount !== order.total || captured.amount !== paise(order.total) || (qrId && (payment.paymentMethod !== 'Counter UPI' || captured.method !== 'upi')) || (!qrId && (payment.paymentMethod !== 'Online (Razorpay)' || payment.gatewayOrderId !== captured.order_id))) {
      return res.status(409).json({ success: false });
    }
    if (payment.transactionId && payment.transactionId !== captured.id) {
      return res.status(409).json({ success: false, message: 'Payment transaction mismatch.' });
    }
    await Payment.updateOne({ _id: payment._id, status: { $ne: 'Completed' } }, { $set: { status: 'Completed', transactionId: captured.id } });
    await Order.updateOne({ _id: order._id, paymentStatus: { $ne: 'Paid' } }, { $set: { paymentStatus: 'Paid' } });
    const updated = await Order.findById(order._id);
    notify(req, updated);
    res.json({ success: true, paymentStatus: 'Paid', seatAssigned: Boolean(updated?.seatNumber) });
  } catch (error) { console.error('Razorpay webhook:', error); res.status(500).json({ success: false }); }
});

module.exports = router;
