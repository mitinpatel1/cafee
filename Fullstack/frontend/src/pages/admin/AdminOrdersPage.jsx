import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/api';
import { useSocket } from '../../context/SocketContext';
import { Clock3, RefreshCw, ReceiptIndianRupee, ChefHat, CheckCircle2, Wallet } from 'lucide-react';

const next = {Pending:'Confirmed',Confirmed:'Preparing',Preparing:'Ready',Ready:'Picked Up'};
const label = {Confirmed:'Accept order & set ETA',Preparing:'Start preparing',Ready:'Mark ready', 'Picked Up':'Hand over order'};
export const AdminOrdersPage = () => {
  const [orders,setOrders] = useState([]);
  const [filter,setFilter] = useState('All');
  const [eta,setEta] = useState({});
  const [upiRef,setUpiRef] = useState({});
  const [busy,setBusy] = useState('');
  const [error,setError] = useState('');
  const [loading,setLoading] = useState(true);
  const {socket}=useSocket();
  const refresh=useCallback(async()=>{
    try { const result=await api.getAllOrders({});setOrders(result.orders||[]);setError(''); }
    catch(e) {setError(e.message);} finally {setLoading(false);}
  },[]);
  useEffect(()=>{refresh();},[refresh]);
  useEffect(()=>{
    if(!socket)return;
    const receive=()=>refresh();
    socket.on('new_order',receive);socket.on('order_status_updated',receive);
    return()=>{socket.off('new_order',receive);socket.off('order_status_updated',receive);};
  },[socket,refresh]);
  const transition=async(order,status)=>{
    setBusy(order._id);setError('');
    try{
      const mins=['Confirmed','Preparing'].includes(status)?Number(eta[order._id]||15):undefined;
      await api.updateOrderStatus(order._id,status,mins);
      await refresh();
    }catch(e){setError(e.message);}finally{setBusy('');}
  };
  const pay=async order=>{
    if(!window.confirm(`Have you actually received ₹${order.total} at the counter?`))return;
    setBusy(order._id);setError('');
    try{await api.collectCounterPayment(order._id,upiRef[order._id]||'');await refresh();}
    catch(e){setError(e.message);}finally{setBusy('');}
  };
  const displayed=orders.filter(o=>filter==='All'||o.status===filter);
  const active=orders.filter(o=>!['Picked Up','Cancelled'].includes(o.status));
  return <div className="service-console">
    <div className="service-heading"><div><p className="section-kicker">SERVICE OPERATIONS</p><h1>Live order desk</h1><p>Accept orders, respond with a preparation time, control handover and record actual payments.</p></div><button className="btn btn-secondary" onClick={refresh}><RefreshCw size={16}/> Refresh orders</button></div>
    <div className="service-metrics"><div><ReceiptIndianRupee/><b>{orders.length}</b><span>Total orders</span></div><div><Clock3/><b>{active.length}</b><span>In progress</span></div><div><ChefHat/><b>{orders.filter(x=>x.status==='Preparing').length}</b><span>Cooking now</span></div><div><Wallet/><b>{orders.filter(x=>x.paymentStatus==='Pending').length}</b><span>Payment pending</span></div></div>
    <div className="service-filters">{['All','Pending','Confirmed','Preparing','Ready','Picked Up','Cancelled'].map(s=><button key={s} className={filter===s?'active':''} onClick={()=>setFilter(s)}>{s}</button>)}</div>
    {error&&<p className="portal-error" role="alert">{error}</p>}
    {loading?<div className="ob-empty">Loading service orders…</div>:!displayed.length?<div className="ob-empty">No orders for this filter.</div>:
      <div className="service-orders">{displayed.map(order=><article className="service-order" key={order._id}>
        <div className="service-order-head"><div><small>{new Date(order.createdAt).toLocaleString()}</small><h3>#{order.orderNumber}</h3><span>{order.userId?.name||'Customer'} · {order.franchiseId?.name||'Franchise pickup'}</span></div><span className={`service-status ${order.status.toLowerCase().replaceAll(' ','-')}`}>{order.status}</span></div>
        <div className="service-order-lines">{order.items.map((item,i)=><span key={i}>{item.quantity} × {item.name}</span>)}</div>
        {order.notes&&<p className="service-notes">Instructions: {order.notes}</p>}
        <div className="service-order-details"><span><b>₹{order.total}</b> total</span><span>Payment: <b>{order.paymentMethod}</b></span><span>Payment status: <b>{order.paymentStatus}</b></span><span>ETA: <b>{order.estimatedReadyTime ? new Date(order.estimatedReadyTime).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}):'Awaiting confirmation'}</b></span></div>
        <div className="service-order-actions">
          {next[order.status] && <>
            {['Pending','Confirmed'].includes(order.status) && <label className="service-eta">Preparation time (minutes)<input type="number" min="1" max="180" value={eta[order._id]??15} onChange={e=>setEta(v=>({...v,[order._id]:e.target.value}))}/></label>}
            <button disabled={busy===order._id || (next[order.status]==='Picked Up' && order.paymentStatus!=='Paid') || (order.paymentMethod==='Online (Razorpay)' && order.paymentStatus!=='Paid')} className="service-primary" onClick={()=>transition(order,next[order.status])}>{label[next[order.status]]}</button>
          </>}
          {['Pending','Confirmed'].includes(order.status) && <button disabled={busy===order._id} className="service-secondary" onClick={()=>transition(order,'Cancelled')}>Reject order</button>}
          {['Counter Cash','Counter UPI','Cash on Pickup'].includes(order.paymentMethod) && order.paymentStatus!=='Paid'&& order.status!=='Cancelled' && <div className="service-payment">{order.paymentMethod==='Counter UPI'&&<input value={upiRef[order._id]||''} onChange={e=>setUpiRef(v=>({...v,[order._id]:e.target.value}))} placeholder="UPI transaction reference" aria-label="UPI transaction reference"/>}<button disabled={busy===order._id} onClick={()=>pay(order)}><CheckCircle2 size={16}/> Confirm payment received</button></div>}
        </div>
      </article>)}</div>}
  </div>;
};
