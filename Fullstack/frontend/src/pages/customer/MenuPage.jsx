import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { useSearchParams, Link } from 'react-router-dom';
import { ShoppingCart, ChevronDown, SlidersHorizontal, Store } from 'lucide-react';
import { useFranchiseSelection } from '../../context/FranchiseSelectionContext';
import { loadMenu } from '../../api/menuSource';
import { useCart } from '../../context/CartContext';
import { MenuCard } from '../../components/ui/MenuCard';
import { MENU_BANNER_IMAGE } from '../../constants/menuPhotography';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CATEGORIES = ['All', 'Breakfast', 'Lunch', 'Snacks', 'Beverages', 'Desserts'];
const FEATURED = ['idli sambar', 'masala dosa', 'veg fried rice', 'paneer butter masala', 'grilled veg sandwich', 'veg sandwich', 'french fries', 'iced tea', 'chocolate brownie'];

export const MenuPage = () => {
  const pageRef = useRef(null);
  const [params, setParams] = useSearchParams();
  const rawCategory = params.get('category') || 'All';
  const category = rawCategory === 'All Items' ? 'All' : rawCategory;
  const search = params.get('search') || '';
  const [items, setItems] = useState([]);
  const [diet, setDiet] = useState('All');
  const [sortBy, setSortBy] = useState('Featured');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { itemCount, total } = useCart();
  const { franchises, selectedId, selectFranchise, loading: branchesLoading, error: branchesError } = useFranchiseSelection();

  useEffect(() => {
    if (branchesLoading) return;
    let active = true;
    setLoading(true);
    setError('');
    loadMenu({ franchiseId: selectedId || undefined, category: category === 'All' ? undefined : category, search })
      .then(list => {
        if (!active) return;
        let result = [...list];
        if (diet === 'Veg') result = result.filter(it => it.isVeg === true);
        if (diet === 'Non Veg') result = result.filter(it => it.isVeg === false);
        if (sortBy === 'Featured') result.sort((a, b) => {
          const ai = FEATURED.indexOf(a.name?.toLowerCase());
          const bi = FEATURED.indexOf(b.name?.toLowerCase());
          if (ai >= 0 && bi >= 0) return ai - bi;
          if (ai >= 0) return -1;
          if (bi >= 0) return 1;
          return Number(Boolean(b.isPopular)) - Number(Boolean(a.isPopular));
        });
        if (sortBy === 'Price: Low to High') result.sort((a, b) => a.price - b.price);
        if (sortBy === 'Price: High to Low') result.sort((a, b) => b.price - a.price);
        if (sortBy === 'Top Rated') result.sort((a, b) => (b.rating || 0) - (a.rating || 0));
        setItems(result);
        setLoading(false);
      })
      .catch(err => {
        if (active) { setError(err.message || 'The menu is unavailable.'); setLoading(false); }
      });
    return () => { active = false; };
  }, [category, search, diet, sortBy, selectedId, branchesLoading]);

  useGSAP(() => {
    if (loading || !items.length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.from('.caf-food-card', {
      opacity: 0, y: 21, duration: 0.55, ease: 'power2.out',
      stagger: { each: 0.035, from: 'start' },
      clearProps: 'all',
      scrollTrigger: { trigger: '.caf-food-grid', start: 'top 95%', once: true },
    });
  }, { scope: pageRef, dependencies: [loading, category, diet, sortBy, selectedId], revertOnUpdate: true });

  useGSAP(() => {
    gsap.from('.caf-banner-copy > *', {
      y: 14, opacity: 0, duration: .65, stagger: .09,
      ease: 'power2.out', clearProps: 'all',
    });
  }, { scope: pageRef });

  const chooseCategory = c => {
    const next = new URLSearchParams(params);
    if (c === 'All') next.delete('category'); else next.set('category', c);
    setParams(next);
  };

  const clearFilters = () => {
    setParams({});
    setDiet('All');
    setSortBy('Featured');
  };

  return (
    <div ref={pageRef} className="caf-menu-page">
      <section className="caf-banner" aria-labelledby="caf-menu-title">
        <div className="caf-banner-copy">
          <span>CAFETERIA MENU</span>
          <h1 id="caf-menu-title">Our Menu</h1>
          <p>Fresh ingredients, great taste, every day.</p>
        </div>
        <div className="caf-banner-picture" aria-hidden="true" style={{ backgroundImage: `url(${MENU_BANNER_IMAGE})` }} />
      </section>

      <div className="caf-menu-controls">
        <div className="caf-category-tabs" role="group" aria-label="Food category">
          {CATEGORIES.map(c => (
            <button key={c} type="button" className={category === c ? 'active' : ''} aria-pressed={category === c} onClick={() => chooseCategory(c)}>{c}</button>
          ))}
        </div>
        <button className={`caf-filter-toggle ${filtersOpen ? 'open' : ''}`} type="button" aria-expanded={filtersOpen} onClick={() => setFiltersOpen(v => !v)}>
          <SlidersHorizontal size={16} /> Filters <ChevronDown size={14} />
        </button>
      </div>

      <div className="caf-menu-branch-line">
        <div className="caf-branch-info"><Store size={17} /> <span>Available at</span></div>
        <label className="caf-branch-select">
          <span className="sr-only">Select cafeteria kitchen</span>
          <select disabled={branchesLoading} value={selectedId || ''} onChange={e => selectFranchise(e.target.value)}>
            {franchises.length ? franchises.map(f => (
              <option key={f._id} value={f._id}>{f.name}{f.city ? ` · ${f.city}` : ''}</option>
            )) : <option value="">No active kitchen yet</option>}
          </select>
          <ChevronDown size={13} aria-hidden="true" />
        </label>
        {!loading && !error && <span className="caf-menu-results">{items.length} dishes</span>}
      </div>

      {filtersOpen && (
        <div className="caf-advanced-filters">
          <div className="caf-diet-choices" role="group" aria-label="Dietary preference">
            {['All', 'Veg', 'Non Veg'].map(d => <button key={d} type="button" className={diet === d ? 'active' : ''} onClick={() => setDiet(d)}>{d === 'All' ? 'All food' : d === 'Veg' ? '● Veg' : '● Non-veg'}</button>)}
          </div>
          <label>Sort by
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option>Featured</option><option>Price: Low to High</option><option>Price: High to Low</option><option>Top Rated</option>
            </select>
          </label>
        </div>
      )}

      {branchesError && <div className="caf-alert" role="alert">Kitchen list unavailable: {branchesError}</div>}
      {!branchesLoading && !selectedId && !error && <div className="caf-note">Browse the daily catalogue below. An active franchise is required before adding items to the cart.</div>}
      {search && <p className="caf-search-caption">Search results for <strong>“{search}”</strong></p>}

      {loading || branchesLoading ? (
        <div className="caf-food-grid" aria-label="Loading menu">
          {Array.from({ length: 8 }, (_, index) => <div key={index} className="caf-food-skeleton" />)}
        </div>
      ) : error ? (
        <div className="caf-menu-empty" role="alert"><h3>Menu is unavailable</h3><p>{error}. Please check that your backend and MongoDB are connected.</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div>
      ) : items.length === 0 ? (
        <div className="caf-menu-empty"><h3>No dishes found</h3><p>Try another category or clear your search and filters.</p><button type="button" onClick={clearFilters}>Clear filters</button></div>
      ) : (
        <div className="caf-food-grid">
          {items.map(item => <MenuCard key={item._id} item={item} canOrder={Boolean(selectedId)} />)}
        </div>
      )}

      {itemCount > 0 && (
        <Link to="/cart" className="caf-floating-cart" aria-label={`View cart with ${itemCount} items for ₹${total}`}>
          <ShoppingCart size={18} /> <span>{itemCount} items · ₹{total}</span><strong>View Cart →</strong>
        </Link>
      )}
    </div>
  );
};
