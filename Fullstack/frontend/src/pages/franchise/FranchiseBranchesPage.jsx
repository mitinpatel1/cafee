import React, { useEffect, useState } from 'react';
import { api } from '../../api/api';

export const FranchiseBranchesPage = () => {
  const [franchises, setFranchises] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.getMyFranchises().then(r => setFranchises(r.franchises || [])).catch(e => setError(e.message)).finally(() => setLoading(false)); }, []);
  return <div><h1 style={{fontSize:'2rem',fontWeight:800}}>My Franchise</h1><p>Locations registered to your owner account.</p>
    {error && <div className="portal-error" role="alert">{error}</div>}
    {loading ? <p>Loading locations…</p> : <div className="branch-grid" style={{marginTop:'1.5rem'}}>{franchises.map(f => <article className="branch-card" key={f._id}><h3>{f.name}</h3><p>{f.brandName}</p><p>{f.city} · {f.address}</p><p>Email: {f.email}</p><p>Phone: {f.phone}</p><p>Service hours: {f.openTime} – {f.closeTime}</p><b>Status: {f.status}</b></article>)}{franchises.length === 0 && <p>No franchise linked to your account.</p>}</div>}
  </div>;
};
