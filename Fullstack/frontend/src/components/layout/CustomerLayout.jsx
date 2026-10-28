import React, { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Utensils, Home, ClipboardList, History, ShoppingCart, UserRound,
  Search, Menu, X, LogOut, ChevronDown, Leaf, CircleUserRound,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { NotificationToast } from '../ui/NotificationToast';
import '../../styles/customer-dashboard.css';

const links = [
  { to: '/menu', label: 'Menu', icon: Home },
  { to: '/my-orders', label: 'My Orders', icon: ClipboardList },
  { to: '/order-history', label: 'Order History', icon: History },
  { to: '/cart', label: 'Cart', icon: ShoppingCart, counter: true },
  { to: '/profile', label: 'Profile', icon: UserRound },
];

function CustomerAvatar({ user, size = 'normal' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user?.avatar]);
  return (
    <span className={`caf-user-avatar ${size === 'small' ? 'caf-user-avatar--sm' : ''}`}>
      {user?.avatar && !failed ? (
        <img src={user.avatar} alt="" onError={() => setFailed(true)} />
      ) : user?.name ? (
        <span>{user.name.charAt(0).toUpperCase()}</span>
      ) : (
        <CircleUserRound size={23} aria-hidden="true" />
      )}
    </span>
  );
}

export function CustomerLayout({ children }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const { user, isAuthenticated, logout } = useAuth();
  const { itemCount } = useCart();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [query, setQuery] = useState('');
  const accountRef = useRef(null);

  useEffect(() => {
    setMobileOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (pathname === '/menu' || pathname === '/') {
      setQuery(new URLSearchParams(search).get('search') || '');
    }
  }, [pathname, search]);

  useEffect(() => {
    const close = (event) => {
      if (accountRef.current && !accountRef.current.contains(event.target)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const submitSearch = (event) => {
    event.preventDefault();
    navigate(query.trim() ? `/menu?search=${encodeURIComponent(query.trim())}` : '/menu');
    setMobileOpen(false);
  };

  const signOut = () => {
    logout();
    setAccountOpen(false);
    navigate('/login');
  };

  return (
    <div className="caf-dashboard-shell">
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="caf-mobile-scrim"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside className={`caf-sidebar ${mobileOpen ? 'caf-sidebar--open' : ''}`} aria-label="Customer sidebar">
        <Link to="/menu" className="caf-brand" onClick={() => setMobileOpen(false)}>
          <span className="caf-brand-mark"><Utensils size={29} strokeWidth={2} /></span>
          <strong>Office Cafeteria</strong>
          <small>Good Food <span>•</span> Better Mood</small>
        </Link>
        <nav className="caf-side-links" aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon, counter }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `caf-side-link ${isActive || (to === '/menu' && pathname === '/') ? 'active' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={21} strokeWidth={1.9} aria-hidden="true" />
              <span>{label}</span>
              {counter && <span className="caf-side-count">{itemCount}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="caf-sidebar-bottom" aria-hidden="true">
          <div className="caf-cutlery-art"><Utensils size={45} strokeWidth={1.15} /><Leaf size={24} strokeWidth={1.5} /></div>
          <span>Fresh Food<br />Healthy You</span>
        </div>
      </aside>

      <div className="caf-content-column">
        <header className="caf-topbar">
          <button type="button" className="caf-hamburger" aria-label="Open navigation" aria-expanded={mobileOpen} onClick={() => setMobileOpen(true)}>
            <Menu size={24} />
          </button>
          <form className="caf-top-search" role="search" onSubmit={submitSearch}>
            <Search size={19} strokeWidth={1.9} aria-hidden="true" />
            <input
              type="search"
              aria-label="Search for food items"
              placeholder="Search for food items..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button type="button" aria-label="Clear search" onClick={() => setQuery('')}><X size={15} /></button>
            )}
          </form>

          <div className="caf-top-actions">
            <Link to="/cart" aria-label={`Cart with ${itemCount} items`} className="caf-top-cart">
              <ShoppingCart size={23} strokeWidth={1.8} />
              <span className="caf-cart-badge">{itemCount}</span>
            </Link>
            <div className="caf-account-menu" ref={accountRef}>
              <button
                type="button"
                className="caf-account-trigger"
                aria-label={isAuthenticated ? 'Open profile menu' : 'Sign in'}
                aria-expanded={accountOpen}
                onClick={() => isAuthenticated ? setAccountOpen((v) => !v) : navigate('/login')}
              >
                <CustomerAvatar user={user} />
                {isAuthenticated && <ChevronDown size={13} className="caf-account-chevron" />}
              </button>
              {accountOpen && isAuthenticated && (
                <div className="caf-account-dropdown">
                  <div className="caf-account-intro"><CustomerAvatar user={user} size="small" /><div><b>{user?.name || 'Customer'}</b><small>{user?.email || ''}</small></div></div>
                  <Link to="/profile" onClick={() => setAccountOpen(false)}><UserRound size={16} /> My Profile</Link>
                  <Link to="/my-orders" onClick={() => setAccountOpen(false)}><ClipboardList size={16} /> My Orders</Link>
                  <button type="button" onClick={signOut}><LogOut size={16} /> Sign Out</button>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="caf-main" id="main-content">{children}</main>
      </div>
      <NotificationToast />
    </div>
  );
}
