import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { loadMenu } from '../api/menuSource';
import { MENU_ITEMS, CATEGORIES } from '../data/menuItems';
import { MenuCard } from '../components/MenuCard';
import { FoodImage } from '../components/FoodImage';

// Items shown in the hexagon cluster (hero) – chosen by id from the built-in menu.
const HERO_IDS = ['ln04', 'sn02', 'bv02', 'ln08', 'sn01', 'bf06', 'ln01'];
// Hex grid positions: column centre (c) and row (r)
const HEX_POS = [[1, 0], [2, 0], [0.5, 1], [1.5, 1], [2.5, 1], [1, 2], [2, 2]];

const CAT_TEXT = {
  Breakfast: 'Poha, paratha, idli and more to start the day.',
  Lunch: 'Thali, rice bowls and curries, cooked fresh.',
  Snacks: 'Samosa, sandwiches and quick bites.',
  Beverages: 'Chai, coffee, lassi and cold drinks.',
  Desserts: 'Something sweet after lunch.',
};

const stars = '★★★★★';

export const HomePage = () => {
  const [all, setAll] = useState([]);
  const [tab, setTab] = useState('Lunch');

  useEffect(() => { loadMenu().then(setAll); }, []);

  const heroItems = HERO_IDS.map((id) => MENU_ITEMS.find((i) => i._id === id)).filter(Boolean);
  const tabItems = all.filter((i) => i.category === tab).slice(0, 4);
  const count = (c) => all.filter((i) => i.category === c).length;
  const minPrice = all.length ? Math.min(...all.map((i) => i.price)) : 15;
  const avgPrep = all.length ? Math.round(all.reduce((a, i) => a + (i.preparationTime || 8), 0) / all.length) : 8;

  const thali = MENU_ITEMS.find((i) => i._id === 'ln01');
  const chai = MENU_ITEMS.find((i) => i._id === 'bv01');
  const comboPrice = thali.price + chai.price;

  return (
    <div className="ob-wrap">
      {/* Hero */}
      <section className="ob-hero">
        <div>
          <small>Welcome to <b>OfficeBite</b></small>
          <h1>Enjoy Fresh Meals<br />&amp; <em>Tasty Breaks</em></h1>
          <p>Breakfast, lunch thalis, snacks and chai from your office cafeteria. Order from your desk, set a pickup time and collect it hot.</p>
          <div className="ob-hero-cta">
            <Link to="/menu" className="ob-btn">Explore Menu</Link>
            <Link to="/menu?category=Beverages" className="ob-btn ghost">Chai &amp; Coffee</Link>
          </div>
        </div>
        <div className="ob-hexcluster" role="group" aria-label="Popular dishes">
          {heroItems.map((it, k) => (
            <div className="hx" key={it._id} style={{ '--c': HEX_POS[k][0], '--r': HEX_POS[k][1] }}>
              <FoodImage item={it} className="in" />
            </div>
          ))}
        </div>
      </section>

      {/* Category chips */}
      <section className="ob-chips" aria-label="Categories">
        {CATEGORIES.map((c) => (
          <Link key={c.id} to={`/menu?category=${c.id}`} className="ob-chip">
            <span className="ob-hexicon"><i>{c.icon}</i></span>{c.id}
          </Link>
        ))}
      </section>

      {/* Promo cards */}
      <section className="ob-promos">
        <div className="ob-promo">
          <h3>Skip the Lunch Queue</h3>
          <p>Order before 12:00 and pick up at your slot, with no waiting at the counter.</p>
          <div><Link to="/menu?category=Lunch" className="ob-btn sm">Order Now</Link></div>
          <FoodImage item={MENU_ITEMS.find((i) => i._id === 'ln04')} className="plate" />
        </div>
        <div className="ob-promo">
          <h3>Light &amp; Healthy Options</h3>
          <p>Salad bowls, idli, poha and fresh juices for a lighter workday.</p>
          <div><Link to="/menu?category=Lunch" className="ob-btn sm">Order Now</Link></div>
          <FoodImage item={MENU_ITEMS.find((i) => i._id === 'ln10')} className="plate" />
        </div>
      </section>

      {/* Priority split */}
      <section className="ob-split">
        <FoodImage item={MENU_ITEMS.find((i) => i._id === 'ln08')} className="ob-bigplate" />
        <div>
          <h2>Serving Fresh Food Is Our First Priority</h2>
          <p>Every dish is cooked on site during the day, not reheated. Veg and non-veg are prepared at separate counters, and the menu changes with what is fresh.</p>
          <Link to="/menu" className="ob-btn">Learn More</Link>
          <div className="ob-stats">
            <div className="ob-stat"><b>{all.length || 41}</b><span>Menu items</span></div>
            <div className="ob-stat"><b>₹{minPrice}</b><span>Prices from</span></div>
            <div className="ob-stat"><b>{avgPrep} min</b><span>Avg. prep time</span></div>
          </div>
        </div>
      </section>

      {/* Types */}
      <section className="ob-sec">
        <div className="ob-sec-head">
          <h2>We Offer Many Types of Food</h2>
          <p>From a quick chai to a full thali, pick what fits your break.</p>
        </div>
        <div className="ob-types">
          {CATEGORIES.map((c) => (
            <Link key={c.id} to={`/menu?category=${c.id}`} className="ob-type">
              <span className="ob-hexicon"><i>{c.icon}</i></span>
              <span className="ob-stars" aria-hidden="true">{stars}</span>
              <h3>{c.id}</h3>
              <span className="cnt">{count(c.id)} items available</span>
              <p>{CAT_TEXT[c.id]}</p>
              <span className="go">Order Now →</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Combo banner */}
      <section className="ob-combo">
        <div>
          <h2>Veg Thali + Masala Chai,<br />just <em>₹{comboPrice}</em></h2>
          <p>Our most ordered lunch with a hot chai to finish. Add both to your tray in one tap.</p>
          <div style={{ display: 'flex', gap: '.7rem', flexWrap: 'wrap' }}>
            <Link to="/menu?category=Lunch" className="ob-btn sm">Order Combo</Link>
            <Link to="/menu" className="ob-btn sm ghost">View All Menu</Link>
          </div>
        </div>
        <div className="ob-combo-art">
          <div className="ob-hexcluster">
            <div className="hx" style={{ '--c': 0.5, '--r': 0 }}>
              <FoodImage item={thali} className="in" />
            </div>
          </div>
        </div>
      </section>

      {/* Deals with tabs */}
      <section className="ob-sec">
        <div className="ob-sec-head">
          <h2>Delicious Deals for Delicious Meals</h2>
          <p>Our most loved dishes, by meal time.</p>
        </div>
        <div className="ob-tabs" role="tablist">
          {CATEGORIES.map((c) => (
            <button key={c.id} role="tab" aria-selected={tab === c.id} className={tab === c.id ? 'on' : ''} onClick={() => setTab(c.id)}>{c.id}</button>
          ))}
        </div>
        <div className="ob-grid">
          {tabItems.map((i) => <MenuCard key={i._id} item={i} />)}
        </div>
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link to={`/menu?category=${tab}`} className="ob-btn ghost">See all {tab.toLowerCase()} <ArrowRight size={15} /></Link>
        </div>
      </section>
    </div>
  );
};
