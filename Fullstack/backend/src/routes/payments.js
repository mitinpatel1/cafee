const express = require('express');
const crypto = require('crypto');
const Order = require('../models/Order');
const Payment = require('../models/Payment');
const { protect, authorize } = require('../middleware/auth');
const router = express.Router();
const configured = () => !!(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

async function razorpay(path, method='GET', body) {
  const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {method,headers:{Authorization:`Basic ${auth}`,'Content-Type':'application/json'}, ...(body ? {body:JSON.stringify(body)} : {})});
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.description || 'Payment gateway request failed.');
  return data;
}
router.get('/config', (_req,res) => res.json({success:true,onlineEnabled:configured(),keyId:configured() ? process.env.RAZORPAY_KEY_ID : null}));
router.post('/initiate', protect, authorize('user','employee'), async (req,res) => {
  try {
    if (!configured()) return res.status(503).json({success:false,message:'Online payment not configured.'});
    const order = await Order.findOne({_id:req.body.orderId,userId:req.user._id});
    if (!order || order.paymentMethod !== 'Online (Razorpay)' || order.status === 'Cancelled') return res.status(400).json({success:false,message:'Not an eligible online order.'});
    if (order.paymentStatus === 'Paid') return res.status(409).json({success:false,message:'Order already paid.'});
    let payment = await Payment.findOne({orderId:order._id,status:{$in:['Initiated','Processing']}}).sort({createdAt:-1});
    if (!payment) {
      const gateway = await razorpay('orders','POST',{amount:Math.round(order.total*100),currency:'INR',receipt:order.orderNumber,notes:{officebiteOrderId:String(order._id)}});
      payment = await Payment.create({orderId:order._id,userId:req.user._id,amount:order.total,paymentMethod:order.paymentMethod,paymentId:`OBP-${crypto.randomBytes(9).toString('hex')}`,gatewayOrderId:gateway.id,status:'Initiated'});
    }
    res.json({success:true,gatewayOrderId:payment.gatewayOrderId,keyId:process.env.RAZORPAY_KEY_ID,amount:Math.round(order.total*100),currency:'INR',name:req.user.name});
  } catch(e) {res.status(502).json({success:false,message:e.message});}
});
router.post('/verify', protect, authorize('user','employee'), async(req,res) => {
  try {
    const {orderId,razorpay_order_id,razorpay_payment_id,razorpay_signature} = req.body;
    if (![orderId,razorpay_order_id,razorpay_payment_id,razorpay_signature].every(x=>typeof x==='string')) return res.status(400).json({success:false,message:'Missing gateway response.'});
    const payment = await Payment.findOne({orderId,userId:req.user._id,gatewayOrderId:razorpay_order_id});
    const order = await Order.findOne({_id:orderId,userId:req.user._id});
    if (!payment || !order || order.paymentMethod !== 'Online (Razorpay)') return res.status(403).json({success:false,message:'Payment does not belong to this order.'});
    const expected = crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET).update(`${payment.gatewayOrderId}|${razorpay_payment_id}`).digest('hex');
    const valid = /^[a-f\d]{64}$/i.test(razorpay_signature) && crypto.timingSafeEqual(Buffer.from(expected,'hex'),Buffer.from(razorpay_signature,'hex'));
    if (!valid) return res.status(403).json({success:false,message:'Invalid gateway signature.'});
    // Server-to-server capture check prevents marking an authorized-but-not-captured payment as settled.
    const captured = await razorpay(`payments/${encodeURIComponent(razorpay_payment_id)}`);
    if (captured.status !== 'captured' || captured.order_id !== payment.gatewayOrderId || captured.amount !== Math.round(order.total*100)) return res.status(409).json({success:false,message:'Payment not yet captured. Check again later.'});
    payment.status = 'Completed'; payment.transactionId = captured.id; await payment.save();
    order.paymentStatus = 'Paid'; await order.save();
    const io = req.app.get('io');
    if (io) {
      io.to('kitchen').emit('order_status_updated',{orderId:order._id,status:order.status,order});
      io.to(`user_${order.userId}`).to(`order_${order._id}`).emit('order_status_updated',{orderId:order._id,status:order.status,order});
      io.to(`franchise_${order.franchiseId}`).emit('franchise_order_updated',order);
    }
    res.json({success:true,order});
  } catch(e) {res.status(502).json({success:false,message:'Online payment verification failed. Contact support with your payment reference.'});}
});
router.get('/status/:orderId', protect, async (req,res) => {
  const order = await Order.findById(req.params.orderId).catch(()=>null);
  if (!order || (req.user.role !== 'admin' && String(order.userId) !== String(req.user._id))) return res.status(404).json({success:false,message:'Payment not found.'});
  res.json({success:true,paymentStatus:order.paymentStatus,paymentMethod:order.paymentMethod});
});
module.exports = router;
