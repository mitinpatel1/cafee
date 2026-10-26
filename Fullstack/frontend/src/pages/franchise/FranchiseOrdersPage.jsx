import React, {useEffect,useState} from 'react';
import { api } from '../../api/api';
import { useSocket } from '../../context/SocketContext';
import { RefreshCw } from 'lucide-react';
export const FranchiseOrdersPage=()=>{
  const [orders,setOrders]=useState([]);const [error,setError]=useState('');const {socket}=useSocket();
  const refresh=async()=>{try{const r=await api.getFranchiseOrders();setOrders(r.orders||[]);setError('');}catch(e){setError(e.message);}};
  useEffect(()=>{refresh();},[]);
  useEffect(()=>{if(!socket)return;socket.on('franchise_order_updated',refresh);return()=>socket.off('franchise_order_updated',refresh);},[socket]);
  return <div className="owner-orders"><div className="service-heading"><div><p className="section-kicker">FRANCHISE ANALYTICS</p><h1>Customer orders</h1><p>All orders sent to your franchise. Service team controls preparation, ETA, payment and handover.</p></div><button className="btn btn-secondary" onClick={refresh}><RefreshCw size={16}/> Refresh</button></div>
    {error&&<p className="portal-error">{error}</p>}
    <div className="service-orders">{orders.map(o=><article className="service-order" key={o._id}><div className="service-order-head"><div><small>{new Date(o.createdAt).toLocaleString()}</small><h3>#{o.orderNumber}</h3><span>{o.franchiseId?.name} · {o.userId?.name||'Customer'}</span></div><span className="service-status">{o.status}</span></div><p>{o.items.map(i=>`${i.quantity} × ${i.name}`).join(' · ')}</p><div className="service-order-details"><span><b>₹{o.total}</b></span><span>{o.paymentMethod}</span><span><b>{o.paymentStatus}</b></span><span>ETA: {o.estimatedReadyTime?new Date(o.estimatedReadyTime).toLocaleTimeString():'Awaiting service confirmation'}</span></div></article>)}{!orders.length&&<div className="ob-empty">No orders have been placed yet.</div>}</div>
  </div>;
};
