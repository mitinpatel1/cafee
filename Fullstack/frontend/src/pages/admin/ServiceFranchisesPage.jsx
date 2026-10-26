import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';
const statuses = ['Active', 'Inactive', 'Pending', 'Suspended'];
export const ServiceFranchisesPage = () => {
  const [franchises, setFranchises] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const refresh = async () => { try { const r = await api.getAllFranchises(); setFranchises(r.franchises || []); setError(''); } catch (e) { setError(e.message); } };
  useEffect(() => { refresh(); }, []);
  const change = async (id, status) => { setBusy(id); try { await api.updateFranchiseStatus(id, status); await refresh(); } catch(e) { setError(e.message); } finally {setBusy('');} };
  return <div><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:'1rem'}}><div><h1 style={{fontSize:'2rem',fontWeight:800}}>Franchise management</h1><p>Service administrators can manage status for all registered franchises.</p></div><button className="btn btn-secondary" onClick={refresh}>Refresh</button></div>
  {error && <div className="portal-error" role="alert">{error}</div>}
  <div className="branch-grid" style={{marginTop:'1.5rem'}}>{franchises.map(f => <article key={f._id} className="branch-card"><h3>{f.name}</h3><p>{f.brandName} · {f.city}</p><p>{f.address}</p><p>Owner: {f.ownerId?.name || 'Unknown'}</p><p>Email: {f.ownerId?.email || f.email}</p><label style={{display:'block',marginTop:'.75rem',fontWeight:700}}>Status<select value={f.status} disabled={busy===f._id} onChange={e=>change(f._id,e.target.value)} style={{display:'block',marginTop:'.35rem',padding:'.55rem',borderRadius:7,border:'1px solid #ded9d2',width:'100%'}}>{statuses.map(s=><option key={s}>{s}</option>)}</select></label></article>)}{franchises.length===0 && <p>No franchises registered yet.</p>}</div>
  </div>;
};
