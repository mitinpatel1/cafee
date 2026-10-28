import React,{useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {api} from '../../api/api';
import {PageHead,Tabs,SearchField,FoodTile,Spinner} from '../../components/ui/CafeteriaKit';
import {Store,RefreshCw} from 'lucide-react';
const cats=['All','Breakfast','Lunch','Snacks','Beverages','Desserts'];
// Only the registered outlet owner is permitted to mutate its menu.
export const AdminMenuPage=()=>{
 const [franchises,setFranchises]=useState([]),[selected,setSelected]=useState(''),[items,setItems]=useState([]),[filter,setFilter]=useState('All'),[search,setSearch]=useState(''),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{api.getAllFranchises().then(r=>{const active=(r.franchises||[]).filter(f=>f.status==='Active');setFranchises(active);setSelected(active[0]?._id||'');if(!active.length)setLoading(false);}).catch(e=>{setError(e.message);setLoading(false);});},[]);
 const refresh=async()=>{if(!selected)return;setLoading(true);try{const r=await api.getMenu({franchiseId:selected});setItems(r.items||[]);setError('');}catch(e){setError(e.message);}finally{setLoading(false);}};
 useEffect(()=>{refresh();},[selected]);
 const displayed=items.filter(i=>(filter==='All'||i.category===filter)&&(`${i.name} ${i.description||''}`.toLowerCase().includes(search.toLowerCase())));
 return <div className="ob-portal-page cf-page"><PageHead title="Menu Management" subtitle="Browse the live menu published by each active franchise outlet" action={<Link className="cf-primary" to="/admin/franchises"><Store size={16}/> Manage Franchises</Link>}/><div className="cf-toolbar"><label className="cf-select-label">Franchise <select value={selected} onChange={e=>setSelected(e.target.value)}>{!franchises.length&&<option value="">No active franchises</option>}{franchises.map(f=><option key={f._id} value={f._id}>{f.name} · {f.city}</option>)}</select></label><SearchField value={search} onChange={setSearch} placeholder="Find a dish..."/><button className="cf-outlined" type="button" onClick={refresh} disabled={!selected||loading}><RefreshCw size={16}/>Refresh</button></div><Tabs items={cats} value={filter} onChange={setFilter}/><p className="cf-help">Menu editing belongs to each franchise owner. This admin screen is a live read-only catalogue.</p>{error&&<p className="ob-portal-error" role="alert">{error}</p>}{loading?<Spinner text="Loading franchise menu..."/>:<div className="cf-food-grid">{displayed.map(item=><FoodTile item={item} key={item._id} controls={<span className={`cf-stock-label ${item.isAvailable?'available':'unavailable'}`}>{item.isAvailable?'Available':'Unavailable'}</span>}/>)}{!displayed.length&&<p className="cf-no-results">No menu items match these filters.</p>}</div>}</div>;
};
