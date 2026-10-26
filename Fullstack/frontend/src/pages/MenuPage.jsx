import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { loadMenu } from '../api/menuSource';
import { useCart } from '../context/CartContext';
import { MenuCard } from '../components/MenuCard';

const TABS = ['All Items', 'Breakfast', 'Lunch', 'Snacks', 'Beverages', 'Desserts'];

export const MenuPage = () => {
  const [params, setParams] = useSearchParams();
  const category = params.get('category') || 'All Items';
  const search = params.get('search') || '';

  const [items, setItems] = useState([]);
  const [diet, setDiet] = useState('All');
  const [sortBy, setSortBy] = useState('Popular');
  const [loading, setLoading] = useState(true);
  const { itemCount, total } = useCart();

  useEffect(() => {
    let alive = true;
    setLoading(true);
    loadMenu({ category: category === 'All Items' ? undefined : category, search }).then((list) => {
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
    });
    return () => { alive = false; };
  }, [category, search, diet, sortBy]);

  const pick = (c) => setParams(c === 'All Items' ? {} : { category: c });
  const reset = () => { setParams({}); setDiet('All'); };

  return (
    <div className="ob-wrap" style={{ paddingBottom: '5rem' }}>
      <section className="ob-menu-head">
        <div>
          <h1>Cafeteria Menu</h1>
          <p>{search ? `Results for “${search}”` : 'Everything on the counter today. Prices include tax.'}</p>
        </div>
        <div className="ob-tabs" role="tablist">
          {TABS.map((t) => (
            <button key={t} role="tab" aria-selected={category === t} className={category === t ? 'on' : ''} onClick={() => pick(t)}>{t}</button>
          ))}
        </div>
      </section>

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
      ) : items.length === 0 ? (
        <div className="ob-empty">
          <div style={{ fontSize: '2.2rem' }}>🍽️</div>
          <h3>Nothing matches these filters</h3>
          <p style={{ marginBottom: '1rem', fontSize: '.88rem' }}>Try another category or clear the veg / non-veg filter.</p>
          <button className="ob-btn" onClick={reset}>Clear filters</button>
        </div>
      ) : (
        <div className="ob-grid">
          {items.map((i) => <MenuCard key={i._id} item={i} />)}
        </div>
      )}

      {itemCount > 0 && (
        <div className="ob-tray" role="status">
          <span style={{ display: 'flex', alignItems: 'center', gap: '.6rem' }}>
            <ShoppingBag size={18} color="#fbb829" /> {itemCount} {itemCount === 1 ? 'item' : 'items'} · ₹{total}
          </span>
          <Link to="/cart">View cart</Link>
        </div>
      )}
    </div>
  );
};
