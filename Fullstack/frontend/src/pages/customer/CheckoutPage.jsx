import React, {useEffect,useState} from 'react';
import { Link,useNavigate } from 'react-router-dom';
import {MapPin, Banknote, ArrowLeft, AlertCircle, Smartphone, CreditCard} from 'lucide-react';
import {useCart} from '../../context/CartContext';
import {useFranchiseSelection} from '../../context/FranchiseSelectionContext';
import {api} from '../../api/api';

const loadRazorpay=()=>new Promise((resolve,reject)=>{
  if(window.Razorpay)return resolve();
  const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=()=>resolve();script.onerror=()=>reject(new Error('Could not load secure payment checkout.'));document.head.appendChild(script);
});
export const CheckoutPage=()=>{
  const {cartItems,subtotal,tax,total,clearCart}=useCart();
  const {franchises,selectedId}=useFranchiseSelection();
  const [method,setMethod]=useState('Counter Cash');const [onlineEnabled,setOnlineEnabled]=useState(false);
  const [notes,setNotes]=useState('');const [error,setError]=useState('');const [loading,setLoading]=useState(false);const navigate=useNavigate();
  useEffect(()=>{api.getPaymentConfig().then(r=>setOnlineEnabled(r.onlineEnabled)).catch(()=>setOnlineEnabled(false));},[]);
  const submit=async e=>{
    e.preventDefault();setLoading(true);setError('');
    let createdOrder;
    try{
      const response=await api.createOrder({franchiseId:selectedId,notes,paymentMethod:method,
        items:cartItems.map(i=>({menuItemId:i.menuItemId,quantity:i.quantity,instructions:i.instructions||''}))});
      createdOrder=response.order;
      if(method==='Online (Razorpay)') {
        await loadRazorpay();
        const checkout=await api.initiatePayment(createdOrder._id,method);
        await new Promise((resolve,reject)=>{
          const gateway=new window.Razorpay({key:checkout.keyId,amount:checkout.amount,currency:'INR',name:'OfficeBite',description:`Order ${createdOrder.orderNumber}`,order_id:checkout.gatewayOrderId,prefill:{name:checkout.name},
            handler:async details=>{try{await api.verifyPayment(createdOrder._id,details.razorpay_payment_id,details.razorpay_order_id,details.razorpay_signature);resolve();}catch(ex){reject(ex);}},
            modal:{ondismiss:()=>reject(new Error('Payment window closed. Your order is awaiting payment.'))}});
          gateway.on('payment.failed',response=>reject(new Error(response.error?.description||'Payment unsuccessful.')));gateway.open();
        });
      }
      clearCart();navigate(`/track/${createdOrder._id}`);
    }catch(e){setError(`${e.message}${createdOrder?` Order #${createdOrder.orderNumber} was saved; its payment is not automatically marked Paid.`:''}`);}
    finally{setLoading(false);}
  };
  if(!cartItems.length)return <div className="portal-auth-wrap"><div className="portal-auth-card"><h2>Your cart is empty</h2><Link className="ob-btn" to="/menu">Browse Menu</Link></div></div>;
  return <div className="portal-checkout ob-wrap"><Link to="/cart" className="portal-back"><ArrowLeft size={15}/> Back to cart</Link><h1>One last step.</h1><p>Choose your kitchen and how you’d like to pay. Service staff will confirm the preparation time.</p>
    {error&&<div className="portal-error" role="alert"><AlertCircle size={16}/>{error}</div>}
    <div className="portal-checkout-grid"><form onSubmit={submit} className="portal-checkout-form">
      <label><MapPin size={18}/> Pickup franchise<select required value={selectedId} disabled><option value="">Choose kitchen</option>{franchises.map(f=><option key={f._id} value={f._id}>{f.name} — {f.city}</option>)}</select><small>To change franchise, go back to Menu (your current cart will be cleared).</small></label>
      <p className="ob-inline-hint">Service dashboard will confirm when your order will be ready.</p>
      <label>Special instructions (optional)<textarea rows={3} maxLength={500} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Anything the kitchen should know?"/></label>
      <fieldset className="payment-choice"><legend>Choose payment method</legend>
        <label className={method==='Counter Cash'?'chosen':''}><input type="radio" name="paymentMethod" checked={method==='Counter Cash'} onChange={()=>setMethod('Counter Cash')}/><Banknote size={22}/><span><b>Cash at counter</b><small>Pay staff at pickup; service records receipt</small></span></label>
        <label className={method==='Counter UPI'?'chosen':''}><input type="radio" name="paymentMethod" checked={method==='Counter UPI'} onChange={()=>setMethod('Counter UPI')}/><Smartphone size={22}/><span><b>UPI at counter</b><small>Scan the counter QR; service confirms transaction</small></span></label>
        <label className={method==='Online (Razorpay)'?'chosen':''}><input type="radio" disabled={!onlineEnabled} name="paymentMethod" checked={method==='Online (Razorpay)'} onChange={()=>setMethod('Online (Razorpay)')}/><CreditCard size={22}/><span><b>Pay online securely</b><small>{onlineEnabled?'Razorpay · verified payment before preparation':'Available after Razorpay keys are configured'}</small></span></label>
      </fieldset>
      <button type="submit" disabled={loading||!selectedId} className="btn btn-primary">{loading?'Processing…':method==='Online (Razorpay)'?'Continue to secure payment':'Place order · Pay at counter'}</button>
    </form><aside className="portal-order-summary"><h2>Your order</h2>{cartItems.map((it,index)=><div key={it.menuItemId||index} className="sum-line"><span>{it.quantity} × {it.name}</span><b>₹{it.price*it.quantity}</b></div>)}<hr/><div className="sum-line"><span>Subtotal</span><b>₹{subtotal}</b></div><div className="sum-line"><span>Tax</span><b>₹{tax}</b></div><div className="sum-line sum-total"><span>Total</span><b>₹{total}</b></div><p className="ob-inline-hint">Order status, ETA and payment confirmation update on the tracking page.</p></aside></div>
  </div>;
};
