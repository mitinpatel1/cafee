import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useFranchiseSelection } from '../../context/FranchiseSelectionContext';
import { loadMenu } from '../../api/menuSource';
import { useCart } from '../../context/CartContext';
import { MenuCard } from '../../components/ui/MenuCard';
gsap.registerPlugin(ScrollTrigger,useGSAP);

const TABS = ['All Items', 'Breakfast', 'Lunch', 'Snacks', 'Beverages', 'Desserts'];

export const MenuPage = () => {
  const pageRef = useRef(null);
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'All Items';
  const search = params.get('search') || '';

  const [items, setItems] = useState([]);
  const [diet, setDiet] = useState('All');
  const [sortBy, setSortBy] = useState('Popular');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { itemCount, total } = useCart();
  const { franchises,selectedId,selectFranchise,loading:branchLoading } = useFranchiseSelection();

  useEffect(() => {
    let alive = true;
    setLoading(true); setError('');
    if (branchLoading) return;
    loadMenu({ franchiseId:selectedId || undefined, category: category === 'All Items' ? undefined : category, search }).then((list) => {
      if (!alive) return;
      let out = [...list];
      if (diet === 'Veg') out = out.filter((i) => i.isVeg);
      if (diet === 'Non Veg') out = out.filter((i) => !i.isVeg);
      if (sortBy === 'Popular') out.sort((a, b) => (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0));
      if (sortBy === 'Price: Low to High') out.sort((a, b) => a.price - b.price);
      if (sortBy === 'Price: High to Low') out.sort((a, b) => b.price - a.price);
      if (sortBy === 'Top Rated') out.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      setItems(out);
      setLoading(false);
    }).catch((err) => { if (alive) { setError(err.message || 'Menu unavailable.'); setLoading(false); } });
    return () => { alive = false; };
  }, [category, search, diet, sortBy, selectedId, branchLoading]);

  useGSAP(() => {
    if (loading || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.from('.ob-card', {opacity:0,y:25,duration:.55,stagger:{each:.045,from:'start'},clearProps:'all',scrollTrigger:{trigger:'.ob-grid',start:'top 88%'}});
  }, {scope:pageRef,dependencies:[loading,category,diet,sortBy,selectedId],revertOnUpdate:true});
  const pick = (c) => setParams(c === 'All Items' ? {} : { category: c });
  const reset = () => { setParams({}); setDiet('All'); };

  return (
    <div ref={pageRef} className="ob-wrap" style={{ paddingBottom: '5rem' }}>
      <section className="ob-menu-head">
        <div>
          <h1>Cafeteria Menu</h1>
          <p>{search ? `Results for “${search}”` : 'Everything on the counter today. Tax is shown at checkout.'}</p>
        </div>
        <div className="ob-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={category === t} className={category === t ? 'on' : ''} onClick={() => pick(t)}>{t}</button>
          ))}
        </div>
      </section>

      <div className="ob-branch-picker"><div><b>Choose your kitchen</b><small>Every franchise manages its own daily menu</small></div><select disabled={branchLoading} value={selectedId} onChange={e=>selectFranchise(e.target.value)} aria-label="Selected franchise">{franchises.length ? franchises.map(f=><option key={f._id} value={f._id}>{f.name} — {f.city}</option>) : <option value="">No active franchises yet</option>}</select></div>
      {!branchLoading && !selectedId && !error && <div className="site-notice" role="status">Our 50 daily favourites are ready to browse. Register or select an active franchise before placing an order. Prices and availability may vary by location.</div>}
      <div className="ob-menu-counts"><span>Breakfast · 10 starter dishes</span><span>Lunch · 15 starter dishes</span><span>Snacks · 15 starter dishes</span><span>Beverages · 10 starter dishes</span></div>
      <div className="ob-toolbar">
        <div className="ob-seg" role="group" aria-label="Diet filter">
          {['All', 'Veg', 'Non Veg'].map((d) => (
            <button key={d} className={diet === d ? 'on' : ''} onClick={() => setDiet(d)}>{d}</button>
          ))}
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', fontSize: '.82rem', color: '#a1a1aa' }}>
          Sort by
          <select className="ob-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option>Popular</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Top Rated</option>
          </select>
        </label>
      </div>

      {loading ? (
        <div className="ob-empty">Loading today's menu…</div>
      ) : error ? (<div className="ob-empty" role="alert">Unable to load menu: {error}. Please check the backend connection.</div>) : items.length === 0 ? (
        <div className="ob-empty">
          <div style={{ fontSize: '2.2rem' }}>🍽️</div>
          <h3>Nothing matches these filters</h3>
          <p style={{ marginBottom: '1rem', fontSize: '.88rem' }}>Try another category or clear the veg / non-veg filter.</p>
          <button className="ob-btn" onClick={reset}>Clear filters</button>
        </div>
      ) : (
        <div className="ob-grid">
          {items.map((i) => <MenuCard key={i._id} item={i} canOrder={Boolean(selectedId)} />)}
        </div>
      )}

      {itemCount > 0 && (
        <div className="ob-tray" role="status">
          <span style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <ShoppingBag size={18} color="#b32638" /> {itemCount} {itemCount === 1 ? 'item' : 'items'} · ₹{total}
          </span>
          <Link to="/cart">View cart</Link>
        </div>
      )}
    </div>
  );
};
