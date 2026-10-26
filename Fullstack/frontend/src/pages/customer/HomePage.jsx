import React, { useEffect, useState, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { Link, useLocation } from 'react-router-dom';
import { ArrowRight, ArrowUpRight, MapPin, Clock3, ChevronRight, Utensils, ShieldCheck, Timer, Sparkles } from 'lucide-react';
import { loadMenu } from '../../api/menuSource';
import { api } from '../../api/api';
import { MenuCard } from '../../components/ui/MenuCard';
import { useFranchiseSelection } from '../../context/FranchiseSelectionContext';
import { PHOTOS } from '../../constants/photography';
gsap.registerPlugin(ScrollTrigger,useGSAP);

const categoryLinks = [
  { label: 'Breakfast', caption: 'Bright starts, better mornings', icon: '01' },
  { label: 'Lunch', caption: 'Fresh choices for lunch', icon: '02' },
  { label: 'Snacks', caption: 'Something between meals', icon: '03' },
  { label: 'Beverages', caption: 'Your daily pick-me-up', icon: '04' },
];

export const HomePage = () => {
  const [items, setItems] = useState([]);
  const { franchises, selectedId, loading:branchesLoading } = useFranchiseSelection();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const pageRef = useRef(null);
  useGSAP(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    gsap.from('.hero-copy > *', { y: 35, opacity: 0, duration: .85, stagger: .12, ease: 'power3.out', clearProps:'all' });
    gsap.from('.hero-visual', { x: 40, opacity:0, scale:.95, duration:1.2, ease:'power3.out',clearProps:'all'});
    gsap.utils.toArray('.editorial-section, .editorial-feature, .editorial-bottom').forEach(section => {
      gsap.from(section, { y:62, opacity:0, duration:1, ease:'power2.out', clearProps:'all', scrollTrigger:{trigger:section,start:'top 88%',toggleActions:'play none none reverse'} });
    });
    gsap.to('.hero-main-photo img', { yPercent:12, ease:'none',scrollTrigger:{trigger:'.editorial-hero',start:'top top',end:'bottom top',scrub:true} });
    gsap.from('.editorial-category', { y:30,opacity:0, stagger:.12,duration:.65,ease:'power2.out',clearProps:'all',scrollTrigger:{trigger:'.editorial-categories',start:'top 86%'} });
  }, {scope:pageRef});
  useEffect(() => {
    let live = true;
    if (branchesLoading) return;
    setLoading(true); setError('');
    loadMenu({franchiseId:selectedId || undefined}).then((menu) => {
      if (live) setItems(menu);
    }).catch(err => { if (live) setError(err.message || 'We cannot connect to our service at the moment.'); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [selectedId,branchesLoading]);

  return <div ref={pageRef} className="gsap-home">
    <div className="editorial-hero">
      <div className="ob-wrap editorial-grid">
        <div className="hero-copy rise-in">
          <div className="eyebrow"><span className="eyebrow-line"/> FRESHLY MADE, EVERY DAY</div>
          <h1>Good food.<br/><span className="hero-outline">Better</span> breaks.</h1>
          <p>Freshly prepared favourites from neighbourhood kitchens. Discover what’s cooking, order in a few taps, and pick up on your schedule.</p>
          <div className="hero-buttons">
            <Link className="btn-editorial" to="/menu">Explore the menu <ArrowUpRight size={18}/></Link>
            <Link className="hero-quiet" to="/my-orders">Track your order <ArrowRight size={17}/></Link>
          </div>
          <div className="hero-micro"><span className="micro-icon"><Timer size={18}/></span> Easy ordering <span className="micro-sep"/> Fresh choices <span className="micro-sep"/> Simple pickup</div>
        </div>
        <div className="hero-visual rise-in delay-1">
          <div className="hero-main-photo"><img src={PHOTOS.hero} alt="Freshly prepared meal photographed at the table" fetchPriority="high"/></div>
          <div className="hero-small-photo"><img src={PHOTOS.table} alt="Warm restaurant dining setting" loading="lazy"/></div>
          <div className="hero-photo-label"><span className="hero-label-dot"/> MADE FOR YOUR BREAK</div>
        </div>
      </div>
      <div className="hero-marquee" aria-hidden="true"><div>MADE FRESH <span>✦</span> PICK UP EASY <span>✦</span> ENJOY MORE <span>✦</span> MADE FRESH <span>✦</span> PICK UP EASY <span>✦</span> ENJOY MORE <span>✦</span></div></div>
    </div>
    <div className="ob-wrap editorial-content">
      {location.state?.registered && <div className="site-notice" role="status">Your franchise registration is complete. You're viewing the customer site. Use the private owner login to manage your franchise.</div>}
      <section className="editorial-section" aria-labelledby="categories-heading">
        <div className="section-intro"><div><p className="section-kicker">EXPLORE THE GOOD STUFF</p><h2 id="categories-heading">Whatever you're <em>craving.</em></h2></div><Link to="/menu" className="text-arrow">View entire menu <ArrowUpRight size={17}/></Link></div>
        <div className="editorial-categories">{categoryLinks.map(cat => <Link to={`/menu?category=${encodeURIComponent(cat.label)}`} className="editorial-category" key={cat.label}><span>{cat.icon}</span><div><strong>{cat.label}</strong><small>{cat.caption}</small></div><ChevronRight size={19}/></Link>)}</div>
      </section>
      <section className="editorial-feature" aria-label="How OfficeBite works">
        <div className="feature-photo"><img src={PHOTOS.kitchen} alt="Restaurant chef preparing meals in a working kitchen" loading="lazy"/></div>
        <div className="feature-copy"><p className="section-kicker">GOOD FOOD, NO FUSS</p><h2>Real kitchens.<br/>Real flavour.</h2><p>See what's available from real locations. Choose the food you love, confirm your pickup, and spend more of your break enjoying it.</p><div className="feature-steps"><span><Utensils size={18}/> Browse real dishes</span><span><MapPin size={18}/> Choose a location</span><span><ShieldCheck size={18}/> Follow your order</span></div><Link to="/menu" className="btn-editorial">Find your next favourite <ArrowUpRight size={17}/></Link></div>
      </section>
      <section className="editorial-section" aria-labelledby="menu-heading">
        <div className="section-intro"><div><p className="section-kicker">ON THE MENU</p><h2 id="menu-heading">Today's <em>favourites.</em></h2></div><Link to="/menu" className="text-arrow">See all dishes <ArrowUpRight size={17}/></Link></div>
        {!selectedId && !branchesLoading && !error && <p className="site-notice">Our daily selection is already published. Select a franchise to order.</p>}
        {loading ? <div className="ob-empty">Checking the kitchen's live menu…</div> : error ? <div className="portal-error" role="alert">Live data is unavailable: {error}</div> : items.length ? <div className="ob-grid">{items.slice(0, 8).map(item => <MenuCard item={item} key={item._id} canOrder={Boolean(selectedId)}/>)}</div> : <div className="ob-empty"><Sparkles size={24}/><p>Our first dishes haven't been published yet. Check back soon.</p></div>}
      </section>
      <section className="editorial-section" aria-labelledby="locations-heading"><div className="section-intro"><div><p className="section-kicker">OUR NETWORK</p><h2 id="locations-heading">Find your <em>kitchen.</em></h2></div><span className="soft-hint">Registered locations accepting orders</span></div>
        {branchesLoading ? <div className="ob-empty">Loading locations…</div> : error ? <div className="portal-error" role="alert">Locations unavailable: {error}</div> : franchises.length ? <div className="branch-grid">{franchises.map(f => <article className="branch-card" key={f._id}><span className="branch-icon"><MapPin size={20}/></span><h3>{f.name}</h3><p>{f.brandName} · {f.city}</p><p>{f.address}</p><small><Clock3 size={14}/> {f.openTime} – {f.closeTime}</small></article>)}</div> : <div className="ob-empty">No active franchises have been registered yet.</div>}
      </section>
      <section className="editorial-bottom"><div><p>BETTER DAYS START HERE</p><h2>Your next good<br/>meal is waiting.</h2></div><Link to="/menu" className="btn-editorial light">Order something good <ArrowUpRight size={20}/></Link></section>
    </div>
  </div>;
};
