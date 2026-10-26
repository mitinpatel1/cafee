import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Leaf, Timer, BadgeIndianRupee, ShieldCheck, ArrowRight } from 'lucide-react';
import { loadMenu } from '../api/menuSource';
import { CATEGORIES } from '../data/menuItems';
import { MenuCard } from '../components/MenuCard';
import { FoodImage } from '../components/FoodImage';

const FEATURES = [
  { icon: Leaf, title: 'Fresh daily', text: 'Cooked every morning with fresh vegetables and ingredients.' },
  { icon: Timer, title: 'Skip the queue', text: 'Order from your desk and collect at your chosen time.' },
  { icon: BadgeIndianRupee, title: 'Pocket friendly', text: 'Chai from ₹15 and full meals from ₹60.' },
  { icon: ShieldCheck, title: 'Hygienic kitchen', text: 'Clean prep area, covered counters, trained staff.' },
];

const HERO_PHOTOS = {
  a: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=500&auto=format&fit=crop&q=80',
  b: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=80',
  c: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=80',
};

const HeroPhoto = ({ cls, src, emoji, alt }) => {
  const [bad, setBad] = useState(false);
  return bad ? (
    <div className={`ph ${cls}`} role="img" aria-label={alt}>{emoji}</div>
  ) : (
    <img className={cls} src={src} alt={alt} onError={() => setBad(true)} />
  );
};

export const HomePage = () => {
  const [all, setAll] = useState([]);
  const [tab, setTab] = useState('Breakfast');
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  useEffect(() => {
    loadMenu().then(setAll);
  }, []);

  const specials = all.filter((i) => i.isPopular && i.isAvailable !== false).slice(0, 4);
  const tabItems = all.filter((i) => i.category === tab).slice(0, 4);

  return (
    <div className="ob-wrap">
      {/* Hero */}
      <section className="ob-hero">
        <div>
          <h1>Good Food Will Always Fuel Your Workday</h1>
          <p>Fresh breakfast, lunch thalis, snacks and chai from your office cafeteria. Order from your desk and pick up hot.</p>
          <Link to="/menu" className="ob-tag-btn">Order Now <ArrowRight size={17} /></Link>
        </div>
        <div className="ob-hero-art" aria-hidden="false">
          <div className="blob" />
          <HeroPhoto cls="a" src={HERO_PHOTOS.a} emoji="☕" alt="Cup of coffee" />
          <HeroPhoto cls="b" src={HERO_PHOTOS.b} emoji="🍔" alt="Veg burger" />
          <HeroPhoto cls="c" src={HERO_PHOTOS.c} emoji="🍛" alt="Paneer butter masala" />
          <div className="ob-stamp"><div><b>₹15</b>chai<br />starts at</div></div>
        </div>
      </section>

      {/* Features */}
      <section className="ob-features" aria-label="Why order here">
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <div className="ob-feature" key={title}>
            <div className="ic"><Icon size={20} /></div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </section>

      {/* About */}
      <section className="ob-about">
        <FoodImage item={{ image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=900&auto=format&fit=crop&q=80', name: 'Cafeteria seating area', emoji: '🍽️' }} className="ob-about-img" />
        <div>
          <h2>Your Office Cafeteria, Now Just a Tap Away</h2>
          <p>
            No more waiting in line during the lunch rush. Choose your meal, set a pickup time and walk up to the counter when it is ready.
            Pay from your employee wallet or at the counter.
          </p>
          <div className="ob-hours">
            <span><b>Breakfast</b> 8:00 – 10:30</span>
            <span><b>Lunch</b> 12:00 – 15:00</span>
            <span><b>Tea &amp; snacks</b> 16:00 – 18:00</span>
          </div>
          <Link to="/menu" className="ob-tag-btn">View Full Menu <ArrowRight size={17} /></Link>
        </div>
      </section>

      {/* Today's special */}
      <section className="ob-sec">
        <div className="ob-sec-head">
          <h2>Our Special Picks</h2>
          <p>What your colleagues order the most.</p>
        </div>
        <div className="ob-grid">
          {specials.map((i) => <MenuCard key={i._id} item={i} />)}
        </div>
      </section>

      {/* Tabs */}
      <section className="ob-sec">
        <div className="ob-sec-head">
          <h2>More From the Counter</h2>
        </div>
        <div className="ob-tabs" role="tablist">
          {CATEGORIES.map((c) => (
            <button key={c.id} role="tab" aria-selected={tab === c.id} className={tab === c.id ? 'on' : ''} onClick={() => setTab(c.id)}>
              {c.id}
            </button>
          ))}
        </div>
        <div className="ob-grid">
          {tabItems.map((i) => <MenuCard key={i._id} item={i} />)}
        </div>
        <div style={{ textAlign: 'center', marginTop: '1.75rem' }}>
          <Link to={`/menu?category=${tab}`} className="ob-tag-btn">See all {tab.toLowerCase()} <ArrowRight size={17} /></Link>
        </div>
      </section>

      {/* Subscribe */}
      <section className="ob-sub">
        <div>
          <h2>Get the daily menu in your inbox</h2>
          <p>Know today's thali and specials before you leave your desk.</p>
        </div>
        {subscribed ? (
          <p style={{ fontWeight: 600 }}>Done. You'll get tomorrow's menu at 9 AM.</p>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); if (email.trim()) setSubscribed(true); }}>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your office email" aria-label="Office email" />
            <button type="submit">Subscribe</button>
          </form>
        )}
      </section>
    </div>
  );
};
