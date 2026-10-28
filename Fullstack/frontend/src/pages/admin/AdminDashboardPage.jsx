import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api';
import { useSocket } from '../../context/SocketContext';
import { PortalBanner, portalMoney } from '../../components/ui/PortalPieces';
import { Metric, Section, SoftLink, Status, FoodThumb, TrendChart, DataTable, orderId, orderName, orderItemsText } from '../../components/ui/CafeteriaKit';
import { ShoppingBag, IndianRupee, Store, Users, RefreshCw, ArrowRight, PackageOpen, BarChart3 } from 'lucide-react';

export const AdminDashboardPage = () => {
  const [orders, setOrders] = useState([]);
  const [report, setReport] = useState({});
  const [franchises, setFranchises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { socket } = useSocket();
  const refresh = useCallback(async () => {
    try {
      const [o, r, f] = await Promise.all([api.getAllOrders(), api.getReports(), api.getAllFranchises()]);
      setOrders(o.orders || []);
      setReport(r.reports || {});
      setFranchises(f.franchises || []);
      setError('');
    } catch(e) {setError(e.message || 'Dashboard unavailable');}
    finally {setLoading(false);}
  }, []);
  useEffect(()=>{refresh();}, [refresh]);
  useEffect(()=>{if(!socket)return;const update=()=>refresh();['new_order','order_status_updated','payment_confirmed'].forEach(k=>socket.on(k,update));return()=>['new_order','order_status_updated','payment_confirmed'].forEach(k=>socket.off(k,update));},[socket,refresh]);
  const active = franchises.filter(f=>f.status==='Active').length;
  const recent = useMemo(()=>[...orders].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,6),[orders]);
  const statusGroups = useMemo(()=>['Pending','Confirmed','Preparing','Ready','Picked Up','Cancelled'].map(s=>({status:s, count:orders.filter(o=>o.status===s).length})), [orders]);
  const popular = report.popularItems || [];
  return <div className="ob-portal-page cf-dashboard">
    <PortalBanner eyebrow="SERVICE CONTROL CENTER" title="Welcome Back, Admin!" description="Manage your cafeteria operations efficiently.">
      <Link className="ob-primary-btn" to="/admin/orders">Manage Orders <ArrowRight size={16}/></Link>
    </PortalBanner>
    <div className="cf-section-line"><div><h2>Dashboard Overview</h2><p>Live operational insights from your connected backend</p></div><button className="cf-outlined" onClick={refresh} type="button" disabled={loading}><RefreshCw size={16}/> Refresh</button></div>
    {error && <div className="ob-portal-error" role="alert">{error}<button onClick={refresh}>Retry</button></div>}
    <div className="cf-stat-grid">
      <Metric icon={ShoppingBag} label="Total Orders" value={loading?'—':orders.length} sub="Across all franchises" />
      <Metric icon={IndianRupee} label="Revenue This Month" value={loading?'—':portalMoney(report.month?.revenue)} sub="Paid, non-cancelled orders" tint="green" />
      <Metric icon={Store} label="Active Franchises" value={loading?'—':active} sub={`${franchises.length} registered outlets`} tint="orange" />
      <Metric icon={Users} label="Total Customers & Users" value={loading?'—':(report.totalUsers??'—')} sub="Registered platform users" tint="peach" />
    </div>
    {(report.lowStockAlerts>0) && <div className="cf-alert"><PackageOpen size={19}/><span><strong>{report.lowStockAlerts} ingredients are low on stock</strong> — review shared kitchen inventory.</span><Link to="/admin/inventory">View Inventory <ArrowRight size={14}/></Link></div>}
    <div className="cf-two-column">
      <Section title="Today's Orders" subtitle="Most recent customer purchases" action={<SoftLink to="/admin/orders">View all</SoftLink>}>
        <DataTable headers={['Order','Customer / items','Amount','Status']} loading={loading} empty={!loading && !recent.length?'No orders found yet.':null}>{recent.map(o=><tr key={o._id}><td className="cf-strong">{orderId(o)}</td><td><b>{orderName(o)}</b><small className="cf-cell-sub">{orderItemsText(o)}</small></td><td>{portalMoney(o.total)}</td><td><Status status={o.status}/></td></tr>)}</DataTable>
      </Section>
      <Section title="Order Overview" subtitle="Orders by preparation status" action={<SoftLink to="/admin/reports">Reports</SoftLink>}>
        <div className="cf-order-bar-list">{statusGroups.map(({status,count})=><div key={status}><div className="cf-bar-label"><span>{status}</span><b>{count}</b></div><div className="cf-progress"><span style={{width:`${orders.length?count/orders.length*100:0}%`}}/></div></div>)}</div>
      </Section>
    </div>
    <div className="cf-two-column bottom">
      <Section title="Sales Overview" subtitle="Last seven calendar days" action={<SoftLink to="/admin/reports">Analytics</SoftLink>}><TrendChart data={report.dailyRevenue||[]}/></Section>
      <Section title="Top Selling Items" subtitle="Most ordered dishes this month" action={<SoftLink to="/admin/menu">Browse Menu</SoftLink>}>
        {popular.length ? <div className="cf-top-items">{popular.slice(0,4).map((item,i)=><div key={item._id||i}><FoodThumb item={{name:item._id}}/><span><b>{item._id}</b><small>{item.totalOrdered} orders</small></span><strong>{portalMoney(item.revenue)}</strong></div>)}</div>:<div className="cf-no-results">Top sellers will show once orders are placed.</div>}
      </Section>
    </div>
    <div className="cf-quick-links"><Link to="/admin/menu"><ShoppingBag size={18}/> Menu Management</Link><Link to="/admin/franchises"><Store size={18}/> Franchises</Link><Link to="/admin/inventory"><PackageOpen size={18}/> Inventory</Link><Link to="/admin/reports"><BarChart3 size={18}/> Reports</Link></div>
  </div>;
};
