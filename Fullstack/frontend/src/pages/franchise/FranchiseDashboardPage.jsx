import React, {useCallback,useEffect,useMemo,useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from '../../api/api';
import {useSocket} from '../../context/SocketContext';
import {PortalBanner,portalMoney} from '../../components/ui/PortalPieces';
import {Metric,Section,SoftLink,DataTable,Status,TrendChart,orderId,orderName,orderItemsText} from '../../components/ui/CafeteriaKit';
import {ShoppingBag,IndianRupee,Users,UtensilsCrossed,RefreshCw,ArrowRight,Store,PackageOpen,BarChart3} from 'lucide-react';
export const FranchiseDashboardPage=()=>{
  const [stats,setStats]=useState({}),[orders,setOrders]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
  const {socket}=useSocket();
  const refresh=useCallback(async()=>{try{const [a,b]=await Promise.all([api.getFranchiseDashboard(),api.getFranchiseOrders()]);setStats(a.stats||{});setOrders(b.orders||[]);setError('');}catch(e){setError(e.message);}finally{setLoading(false);}},[]);
  useEffect(()=>{refresh();},[refresh]);
  useEffect(()=>{if(!socket)return;const fn=()=>refresh();['new_order','franchise_order_updated','order_status_updated','payment_confirmed'].forEach(k=>socket.on(k,fn));return()=>['new_order','franchise_order_updated','order_status_updated','payment_confirmed'].forEach(k=>socket.off(k,fn));},[socket,refresh]);
  const recent=useMemo(()=>[...orders].sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,5),[orders]);
  const dates=useMemo(()=>Array.from({length:7},(_,i)=>{const day=new Date();day.setHours(0,0,0,0);day.setDate(day.getDate()-(6-i));return {day:day.toLocaleDateString('en-IN',{weekday:'short'}),date:day.toDateString(),revenue:orders.filter(o=>new Date(o.createdAt).toDateString()===day.toDateString()&&o.paymentStatus==='Paid'&&o.status!=='Cancelled').reduce((sum,o)=>sum+Number(o.total||0),0)};}),[orders]);
  const branchName=stats.franchises?.[0]?.name || 'Franchise Partner';
  const today=orders.filter(o=>new Date(o.createdAt).toDateString()===new Date().toDateString());
  return <div className="ob-portal-page cf-dashboard">
    <PortalBanner eyebrow="FRANCHISE OPERATIONS" title={`Welcome, ${branchName}!`} description="Manage your outlet, serve customers and grow your business.">
      <Link className="ob-primary-btn" to="/franchise/menu">Manage Menu <ArrowRight size={16}/></Link>
    </PortalBanner>
    <div className="cf-section-line"><div><h2>Franchise Overview</h2><p>Performance across only your registered outlets</p></div><button className="cf-outlined" type="button" disabled={loading} onClick={refresh}><RefreshCw size={16}/> Refresh</button></div>
    {error&&<div className="ob-portal-error" role="alert">{error}<button onClick={refresh}>Retry</button></div>}
    <div className="cf-stat-grid"><Metric icon={ShoppingBag} label="Today's Orders" value={loading?'—':today.length} sub={`${stats.totalOrders||0} total orders`}/><Metric icon={IndianRupee} label="Total Paid Revenue" value={loading?'—':portalMoney(stats.totalRevenue)} sub="Confirmed paid orders" tint="green"/><Metric icon={Users} label="Customer Orders" value={loading?'—':orders.length} sub={`${stats.pendingOrders||0} awaiting action`} tint="peach"/><Metric icon={UtensilsCrossed} label="My Outlets" value={loading?'—':stats.totalFranchises||0} sub={`${stats.activeFranchises||0} active`} tint="orange"/></div>
    <div className="cf-two-column"><Section title="Today's Orders" subtitle="Orders from your outlets" action={<SoftLink to="/franchise/orders">View all</SoftLink>}><DataTable headers={['Order','Customer / items','Amount','Status']} loading={loading} empty={!loading&&!recent.length?'No orders received yet.':null}>{recent.map(o=><tr key={o._id}><td className="cf-strong">{orderId(o)}</td><td><b>{orderName(o)}</b><small className="cf-cell-sub">{orderItemsText(o)}</small></td><td>{portalMoney(o.total)}</td><td><Status status={o.status}/></td></tr>)}</DataTable></Section><Section title="Sales Overview" subtitle="Daily paid revenue · last 7 days" action={<SoftLink to="/franchise/reports">Reports</SoftLink>}><TrendChart data={dates}/></Section></div>
    <div className="cf-two-column bottom"><Section title="Quick Actions" subtitle="Manage day-to-day franchise work"><div className="cf-action-grid"><Link to="/franchise/menu"><UtensilsCrossed/>Manage Menu</Link><Link to="/franchise/orders"><ShoppingBag/>View Orders</Link><Link to="/franchise/inventory"><PackageOpen/>Inventory</Link><Link to="/franchise/reports"><BarChart3/>Reports</Link></div></Section><Section title="My Franchise Locations" subtitle="Outlets linked to your account" action={<SoftLink to="/franchise/branches">View all</SoftLink>}><div className="cf-branch-list">{(stats.franchises||[]).slice(0,3).map(f=><div key={f._id}><Store size={21}/><span><b>{f.name}</b><small>{f.city||'Location not provided'}</small></span><Status status={f.status}/></div>)}{!stats.franchises?.length&&<p className="cf-no-results">No registered outlets.</p>}</div></Section></div>
  </div>;
};
