import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from '../../api/api';
import {PageHead,Status} from '../../components/ui/CafeteriaKit';
import {Store,MapPin,Phone,Clock3,Settings2} from 'lucide-react';
export const FranchiseBranchesPage=()=>{
 const [franchises,setFranchises]=useState([]),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{api.getMyFranchises().then(r=>setFranchises(r.franchises||[])).catch(e=>setError(e.message)).finally(()=>setLoading(false));},[]);
 return <div className="ob-portal-page cf-page"><PageHead title="My Franchise Locations" subtitle="Locations registered to your owner account" action={<Link to="/franchise/settings" className="cf-primary"><Settings2 size={16}/> Outlet Settings</Link>}/>{error&&<p className="ob-portal-error">{error}</p>}{loading?<p className="cf-loading">Loading your branches...</p>:<div className="cf-branch-cards">{franchises.map(f=><article key={f._id} className="cf-panel cf-location"><div className="cf-location-icon"><Store size={28}/></div><div className="cf-location-title"><h2>{f.name}</h2><Status status={f.status}/></div><p>{f.brandName}</p><div className="cf-location-details"><span><MapPin size={17}/>{[f.address,f.city].filter(Boolean).join(', ')}</span><span><Phone size={17}/>{f.phone||'No phone provided'}</span><span><Clock3 size={17}/>{f.openTime||'08:00'} – {f.closeTime||'18:00'}</span></div><Link className="cf-outlined" to="/franchise/settings">Manage Profile</Link></article>)}{!franchises.length&&<p className="cf-no-results">No franchise location is linked to your account.</p>}</div>}</div>;
};
