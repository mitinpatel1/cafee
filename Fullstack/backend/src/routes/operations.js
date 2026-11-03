'use strict';
const express = require('express');
const mongoose = require('mongoose');
const {protect,authorize} = require('../middleware/auth');
const Order = require('../models/Order');
const Franchise = require('../models/Franchise');
const FranchiseIngredient = require('../models/FranchiseIngredient');
const FoodWaste = require('../models/FoodWaste');
const router = express.Router();
router.use(protect);

async function permittedOutlet(req,id) {
  if (!mongoose.isValidObjectId(id)) return null;
  const outlet = await Franchise.findById(id);
  if (!outlet) return null;
  if (req.user.role === 'admin' ||
      (req.user.role === 'franchise' && String(outlet.ownerId) === String(req.user._id))) return outlet;
  return null;
}

// Live Kitchen Display System: admin all outlets, franchise only owned outlets.
router.get('/kitchen',authorize('admin','franchise'),async(req,res)=>{
  try {
    const filter={status:{$in:['Pending','Confirmed','Preparing','Ready']}};
    if (req.user.role==='franchise') {
      const owned=await Franchise.find({ownerId:req.user._id}).select('_id').lean();
      filter.franchiseId={$in:owned.map(outlet=>outlet._id)};
    }
    if (req.query.franchiseId) {
      const outlet=await permittedOutlet(req,req.query.franchiseId);
      if(!outlet) return res.status(403).json({success:false,message:'Outlet access denied.'});
      filter.franchiseId=outlet._id;
    }
    const orders=await Order.find(filter).select('orderNumber franchiseId items status paymentStatus seatNumber createdAt readyInMinutes estimatedReadyTime').populate('franchiseId','name').sort({createdAt:1}).limit(150).lean();
    const active=orders.filter(o=>o.paymentStatus==='Paid' && Number(o.seatNumber)>0);
    return res.json({success:true,orders:active,totals:{active:active.length,waiting:active.filter(o=>o.status==='Pending').length,preparing:active.filter(o=>o.status==='Preparing').length,ready:active.filter(o=>o.status==='Ready').length}});
  }catch(error){console.error('KDS:',error);return res.status(500).json({success:false,message:'Unable to load kitchen orders.'});}
});

// Kitchen workflow for admins and outlet owners. Seat assignment is NOT exposed.
router.patch('/kitchen/:orderId/status', authorize('admin','franchise'), async (req,res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.orderId)) return res.status(400).json({success:false,message:'Invalid order ID.'});
    const order = await Order.findById(req.params.orderId);
    if (!order) return res.status(404).json({success:false,message:'Order not found.'});
    if (!await permittedOutlet(req,order.franchiseId)) return res.status(403).json({success:false,message:'Outlet access denied.'});
    const allowed = {Pending:'Confirmed',Confirmed:'Preparing',Preparing:'Ready',Ready:'Picked Up'};
    const next = String(req.body?.status || '');
    if (allowed[order.status] !== next) return res.status(409).json({success:false,message:'Invalid order status change.'});
    if (order.paymentStatus !== 'Paid' || !Number.isInteger(Number(order.seatNumber)) || Number(order.seatNumber)<1)
      return res.status(409).json({success:false,message:'Customer payment and seat selection must be completed first.'});
    let eta;
    if (['Confirmed','Preparing'].includes(next)) {
      eta = Number(req.body?.readyInMinutes ?? order.readyInMinutes ?? 15);
      if (!Number.isInteger(eta) || eta<1 || eta>180) return res.status(400).json({success:false,message:'ETA must be 1–180 minutes.'});
    }
    const values={status:next};
    if (eta) {values.readyInMinutes=eta;values.estimatedReadyTime=new Date(Date.now()+eta*60000);values.pickupTime=`Ready in about ${eta} minutes`;}
    if (next==='Ready') {values.readyInMinutes=0;values.estimatedReadyTime=new Date();values.pickupTime='Ready for pickup';}
    if (next==='Picked Up') values.pickupTime='Collected';
    const updated=await Order.findOneAndUpdate({
      _id:order._id,status:order.status,paymentStatus:'Paid',seatNumber:{$type:'number',$gte:1}
    },{$set:values},{new:true,runValidators:true});
    if (!updated) return res.status(409).json({success:false,message:'Order changed; refresh and retry.'});
    if (next==='Picked Up') {
      const {releaseSeat}=require('../services/seatService');
      try {await releaseSeat(updated._id);}catch(error){console.error('Seat release:',error);}
    }
    const io=req.app.get('io');
    if(io){
      const event={orderId:updated._id,orderNumber:updated.orderNumber,status:updated.status,paymentStatus:updated.paymentStatus,seatNumber:updated.seatNumber,order:updated};
      io.to('kitchen').emit('order_status_updated',event);
      io.to(`order_${updated._id}`).emit('order_tracking_update',event);
      io.to(`franchise_${updated.franchiseId}`).emit('franchise_order_updated',updated);
    }
    return res.json({success:true,order:updated});
  }catch(error){console.error('Kitchen status:',error);return res.status(500).json({success:false,message:'Unable to update kitchen order.'});}
});

// Read-only seat occupancy. Only the customer kiosk reserves seats.
router.get('/seats/:franchiseId', authorize('admin','franchise'), async (req,res) => {
  try {
    const outlet=await permittedOutlet(req,req.params.franchiseId);
    if(!outlet) return res.status(403).json({success:false,message:'Outlet access denied.'});
    const {listSeats}=require('../services/seatService');
    const seats=await listSeats(outlet._id);
    return res.json({success:true,franchise:{_id:outlet._id,name:outlet.name,city:outlet.city},...seats});
  } catch(error) { console.error('Seat occupancy:',error);return res.status(500).json({success:false,message:'Unable to load seat occupancy.'}); }
});

// Franchise daily sales, low-stock warnings and waste totals.
router.get('/franchise/:id/summary',authorize('admin','franchise'),async(req,res)=>{
  try {
    const outlet=await permittedOutlet(req,req.params.id);
    if(!outlet) return res.status(403).json({success:false,message:'Outlet access denied.'});
    const start=new Date();start.setHours(0,0,0,0);
    const [orders,ingredients,waste]=await Promise.all([
      Order.find({franchiseId:outlet._id,createdAt:{$gte:start}}).select('total paymentStatus status items').lean(),
      FranchiseIngredient.find({franchiseId:outlet._id}).select('name currentStock minStock unit').lean(),
      FoodWaste.find({franchiseId:outlet._id,createdAt:{$gte:start}}).select('cost quantity').lean(),
    ]);
    const paid=orders.filter(o=>o.paymentStatus==='Paid' && o.status!=='Cancelled');
    return res.json({success:true,summary:{ordersToday:orders.length,paidOrdersToday:paid.length,revenueToday:Math.round(paid.reduce((s,o)=>s+o.total,0)*100)/100,lowStock:ingredients.filter(i=>i.currentStock<=i.minStock),wasteCostToday:Math.round(waste.reduce((s,w)=>s+w.cost,0)*100)/100}});
  }catch(error){console.error('Outlet summary:',error);return res.status(500).json({success:false,message:'Unable to load outlet summary.'});}
});

router.get('/franchise/:id/waste',authorize('admin','franchise'),async(req,res)=>{
  try {
    const outlet=await permittedOutlet(req,req.params.id);
    if(!outlet) return res.status(403).json({success:false,message:'Outlet access denied.'});
    const entries=await FoodWaste.find({franchiseId:outlet._id}).sort({createdAt:-1}).limit(200).lean();
    return res.json({success:true,entries});
  }catch{return res.status(500).json({success:false,message:'Unable to load waste register.'});}
});

router.post('/franchise/:id/waste',authorize('admin','franchise'),async(req,res)=>{
  try {
    const outlet=await permittedOutlet(req,req.params.id);
    if(!outlet) return res.status(403).json({success:false,message:'Outlet access denied.'});
    const {name,quantity,unit,reason,cost,note}=req.body||{};
    const q=Number(quantity),c=Number(cost||0);
    if(!String(name||'').trim()||String(name).length>100||!Number.isFinite(q)||q<=0||!Number.isFinite(c)||c<0)
      return res.status(400).json({success:false,message:'Enter a valid item, quantity and cost.'});
    if(!['kg','g','L','ml','pcs'].includes(unit)||!['Expired','Damaged','Preparation','Unsold','Other'].includes(reason))
      return res.status(400).json({success:false,message:'Choose a valid unit and waste reason.'});
    const entry=await FoodWaste.create({franchiseId:outlet._id,name:String(name).trim(),quantity:q,unit,reason,cost:c,note:String(note||'').slice(0,250),recordedBy:req.user._id});
    return res.status(201).json({success:true,entry});
  }catch(error){console.error('Record waste:',error);return res.status(500).json({success:false,message:'Unable to record waste.'});}
});

module.exports=router;
