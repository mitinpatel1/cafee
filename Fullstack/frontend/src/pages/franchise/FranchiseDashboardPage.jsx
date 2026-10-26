import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, ShoppingBag, Clock3, IndianRupee, RefreshCw } from 'lucide-react';
import { api } from '../../api/api';
import { StatCard } from '../../components/ui/StatCard';

export const FranchiseDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const fetchData = async () => {
    setLoading(true); setError('');
    try { const r = await api.getFranchiseDashboard(); setStats(r.stats); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchData(); }, []);
  return <div style={{ display:'flex',flexDirection:'column',gap:'1.5rem' }}>
    <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem',flexWrap:'wrap' }}>
      <div><p style={{color:'#730042',fontWeight:700}}>FRANCHISE OWNER</p><h1 style={{fontSize:'2rem',fontWeight:800}}>Your franchise overview</h1><p>Only your own franchise and its orders are shown here.</p></div>
      <button className="btn btn-secondary" onClick={fetchData}><RefreshCw size={17}/> Refresh</button>
    </div>
    {error && <div className="portal-error" role="alert">{error}</div>}
    {loading ? <p>Loading your franchise data…</p> : stats && <>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(195px,1fr))',gap:'1rem'}}>
        <StatCard title="My Locations" value={stats.totalFranchises} icon={Building2} subtitle={`${stats.activeFranchises} active`} color="#ad2744"/>
        <StatCard title="Total Orders" value={stats.totalOrders} icon={ShoppingBag} subtitle={`${stats.todayOrders} today`} color="#b32638"/>
        <StatCard title="Awaiting Action" value={stats.pendingOrders} icon={Clock3} subtitle="Pending customer orders" color="#d97706"/>
        <StatCard title="Paid Revenue" value={`₹${stats.totalRevenue.toLocaleString()}`} icon={IndianRupee} subtitle="Only recorded paid orders" color="#059669"/>
      </div>
      <h2 style={{fontSize:'1.3rem',fontWeight:800}}>Your registered locations</h2>
      <div className="branch-grid">{stats.franchises.map(f => <div key={f._id} className="branch-card"><h3>{f.name}</h3><p>{f.brandName} · {f.city}</p><p>{f.address}</p><b>{f.status}</b></div>)}</div>
      {!stats.franchises.length && <p>No franchise is linked to this account. Contact the service administrator.</p>}
      <Link to="/franchise/menu" className="btn btn-secondary" style={{maxWidth:260,justifyContent:"center"}}>Manage menu items</Link>
      <Link to="/franchise/orders" className="btn btn-primary" style={{maxWidth:260,justifyContent:'center'}}>View all customer orders</Link>
    </>}
  </div>;
};
