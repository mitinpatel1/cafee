import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import { Search, ShoppingBag, User, LogOut, UtensilsCrossed, ShieldCheck, Menu as MenuIcon, X, Sparkles } from 'lucide-react';

export const Navbar = () => {
  const { user, isAuthenticated, logout, quickLoginAs, isStaffOrAdmin } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const [q, setQ] = useState('');
  const [dropdown, setDropdown] = useState(false);
  const [drawer, setDrawer] = useState(false);

  const on = (p) => (pathname === p ? 'on' : '');
  const submit = (e) => {
    e.preventDefault();
    if (q.trim()) navigate(`/menu?search=${encodeURIComponent(q.trim())}`);
  };

  return (
    <header className="ob-top">
      {/* Demo role switcher (keep for testing, remove for production) */}
      <div className="ob-demo">
        <span style={{ display: 'flex', alignItems: 'center', gap: '.4rem' }}>
          <Sparkles size={12} color="#ff5722" /> Demo mode
        </span>
        <span style={{ display: 'flex', gap: '.4rem', alignItems: 'center' }}>
          <button className={user?.role === 'employee' ? 'on' : ''} onClick={() => quickLoginAs('employee')}>Employee</button>
          <button className={user?.role === 'staff' ? 'on' : ''} onClick={() => { quickLoginAs('staff'); navigate('/admin/orders'); }}>Kitchen</button>
          <button className={user?.role === 'admin' ? 'on' : ''} onClick={() => { quickLoginAs('admin'); navigate('/admin'); }}>Admin</button>
        </span>
      </div>

      <div className="ob-wrap ob-top-inner">
        <Link to="/" className="ob-logo">
          <span className="ob-logo-mark"><UtensilsCrossed size={19} /></span>
          <span>Office<b>Bite</b></span>
        </Link>

        <nav className="ob-pill" aria-label="Main">
          <Link to="/" className={on('/')}>Home</Link>
          <Link to="/menu" className={on('/menu')}>Menu</Link>
          <Link to="/my-orders" className={on('/my-orders')}>My Orders</Link>
          {isStaffOrAdmin && <Link to="/admin">Admin</Link>}
        </nav>

        <div className="ob-actions">
          <form className="ob-search" onSubmit={submit} role="search">
            <Search size={15} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search chai, thali..." aria-label="Search menu" />
          </form>

          <Link to="/cart" className="ob-icon-btn" title="Cart" aria-label="Cart">
            <ShoppingBag size={18} />
            {itemCount > 0 && <span className="ob-badge">{itemCount}</span>}
          </Link>

          {isAuthenticated ? (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setDropdown(!dropdown)} aria-label="Account menu" aria-expanded={dropdown}>
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                  alt={user?.name || 'Account'}
                  style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ff5722', background: '#2a2a31' }}
                />
              </button>
              {dropdown && (
                <div style={{ position: 'absolute', right: 0, top: '120%', width: 220, background: '#fff', color: '#18181b', borderRadius: 14, boxShadow: '0 16px 40px rgba(0,0,0,.35)', padding: '.5rem', zIndex: 100 }}>
                  <div style={{ padding: '.5rem .75rem', borderBottom: '1px solid #edf0f3' }}>
                    <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{user?.name || 'Employee'}</div>
                    <div style={{ fontSize: '.75rem', color: '#64748b' }}>{user?.employeeId} {user?.department ? `• ${user.department}` : ''}</div>
                  </div>
                  <DropLink to="/profile" onClick={() => setDropdown(false)}><User size={15} /> Profile</DropLink>
                  <DropLink to="/my-orders" onClick={() => setDropdown(false)}><ShoppingBag size={15} /> My Orders</DropLink>
                  {isStaffOrAdmin && <DropLink to="/admin" onClick={() => setDropdown(false)} color="#ff5722"><ShieldCheck size={15} /> Admin Dashboard</DropLink>}
                  <button
                    onClick={() => { logout(); setDropdown(false); navigate('/login'); }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.55rem .75rem', fontSize: '.85rem', color: '#ef4444', textAlign: 'left' }}
                  >
                    <LogOut size={15} /> Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="ob-tag-btn" style={{ padding: '.55rem 1.4rem .55rem 1.1rem', fontSize: '.82rem' }}>Sign in</Link>
          )}

          <button className="ob-menu-btn" onClick={() => setDrawer(!drawer)} aria-label="Toggle navigation">
            {drawer ? <X size={22} /> : <MenuIcon size={22} />}
          </button>
        </div>
      </div>

      {drawer && (
        <div className="ob-drawer">
          <Link to="/" onClick={() => setDrawer(false)}>Home</Link>
          <Link to="/menu" onClick={() => setDrawer(false)}>Menu</Link>
          <Link to="/my-orders" onClick={() => setDrawer(false)}>My Orders</Link>
          <Link to="/profile" onClick={() => setDrawer(false)}>Profile</Link>
          {isStaffOrAdmin && <Link to="/admin" onClick={() => setDrawer(false)} style={{ color: '#ff5722' }}>Admin Panel</Link>}
        </div>
      )}
    </header>
  );
};

const DropLink = ({ to, onClick, color = '#18181b', children }) => (
  <Link to={to} onClick={onClick} style={{ display: 'flex', alignItems: 'center', gap: '.5rem', padding: '.55rem .75rem', fontSize: '.85rem', color, borderRadius: 8 }}>
    {children}
  </Link>
);
