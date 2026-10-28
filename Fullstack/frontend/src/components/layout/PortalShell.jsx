import React, { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, ClipboardList, PackageOpen, BarChart3, Store,
  UtensilsCrossed, Search, Bell, Menu, X, LogOut, ArrowLeft,
  ChevronDown, UserRound, Soup, Leaf, ChefHat, Settings2,
} from 'lucide-react';

const adminLinks = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/menu', label: 'Menu Management', icon: UtensilsCrossed },
  { to: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { to: '/admin/franchises', label: 'Franchises', icon: Store },
  { to: '/admin/inventory', label: 'Inventory', icon: PackageOpen },
  { to: '/admin/reports', label: 'Reports', icon: BarChart3 },
];
const franchiseLinks = [
  { to: '/franchise/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/franchise/menu', label: 'Menu Management', icon: UtensilsCrossed },
  { to: '/franchise/orders', label: 'Orders', icon: ClipboardList },
  { to: '/franchise/inventory', label: 'Inventory', icon: PackageOpen },
  { to: '/franchise/reports', label: 'Reports', icon: BarChart3 },
  { to: '/franchise/branches', label: 'My Locations', icon: Store },
  { to: '/franchise/settings', label: 'Settings', icon: Settings2 },
];

/** Shared warm-orange role portal. All authorisation remains in App.jsx ProtectedRoute. */
export const PortalShell = ({ role }) => {
  const isAdmin = role === 'admin';
  const links = isAdmin ? adminLinks : franchiseLinks;
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ordersPath = isAdmin ? '/admin/orders' : '/franchise/orders';
  const loginPath = isAdmin ? '/admin/login' : '/franchise/login';

  const signOut = () => {
    setAccountOpen(false);
    logout();
    navigate(loginPath);
  };
  const submitSearch = (e) => {
    e.preventDefault();
    navigate(search.trim() ? `${ordersPath}?q=${encodeURIComponent(search.trim())}` : ordersPath);
    setOpen(false);
  };

  return (
    <div className={`portal-shell ob-portal ${isAdmin ? 'ob-portal-admin' : 'ob-portal-owner'}`}>
      <aside className={`ob-side ${open ? 'ob-side-open' : ''}`} aria-label={`${role} navigation`}>
        <Link to={isAdmin ? '/admin/dashboard' : '/franchise/dashboard'} className="ob-portal-brand" onClick={() => setOpen(false)}>
          <span className="ob-portal-brand-icon"><UtensilsCrossed size={28} strokeWidth={1.9} /></span>
          <strong>Office Cafeteria</strong>
          <small>Good Food <span>•</span> Better Mood</small>
          <span className="ob-portal-role">{isAdmin ? 'ADMIN PORTAL' : 'FRANCHISE PORTAL'}</span>
        </Link>

        <nav className="ob-portal-nav" aria-label="Main navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} onClick={() => setOpen(false)} className={({ isActive }) => `ob-portal-nav-link ${isActive ? 'active' : ''}`}>
              <Icon size={19} strokeWidth={1.9}/><span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="ob-portal-side-bottom">
          <div className="ob-side-art" aria-hidden="true"><ChefHat size={58} strokeWidth={1.05} /><Leaf size={24} strokeWidth={1.2}/></div>
          <p>Fresh Food<br/>Healthy You</p>
          <Link to="/" className="ob-portal-back" onClick={() => setOpen(false)}><ArrowLeft size={16}/> View Food Menu</Link>
          <button type="button" className="ob-portal-signout" onClick={signOut}><LogOut size={16}/> Logout</button>
        </div>
      </aside>

      {open && <button className="ob-portal-scrim" type="button" aria-label="Close menu" onClick={() => setOpen(false)} />}
      <div className="ob-portal-content">
        <header className="ob-portal-topbar">
          <button className="ob-portal-hamburger" type="button" onClick={() => setOpen(!open)} aria-label={open ? 'Close menu' : 'Open menu'}>{open ? <X size={24}/> : <Menu size={24}/>}</button>
          <form className="ob-portal-search" onSubmit={submitSearch} role="search">
            <Search size={19}/><input aria-label="Search orders" placeholder="Search order ID or customer..." value={search} onChange={e => setSearch(e.target.value)} />
            {search && <button type="submit" className="ob-portal-search-go">Search</button>}
          </form>
          <div className="ob-portal-top-actions">
            <span className="ob-portal-top-role"><span className="ob-live-dot"/> {isAdmin ? 'Service Admin' : 'Franchise Owner'}</span>
            <Link to={ordersPath} className="ob-portal-bell" title="View orders" aria-label="View orders"><Bell size={21}/></Link>
            <div className="ob-portal-account">
              <button type="button" className="ob-portal-account-trigger" aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(!accountOpen)}>
                <span className="ob-portal-avatar"><UserRound size={22} fill="currentColor" strokeWidth={1.3}/></span>
                <ChevronDown size={14} className="ob-portal-account-chevron" />
              </button>
              {accountOpen && <div className="ob-portal-dropdown" role="menu">
                <div className="ob-portal-user"><strong>{user?.name || (isAdmin ? 'Administrator' : 'Franchise Owner')}</strong><small>{user?.email || role}</small></div>
                <Link to={isAdmin ? '/admin/dashboard' : '/franchise/dashboard'} onClick={() => setAccountOpen(false)}><Settings2 size={16}/> Overview</Link>
                <button type="button" onClick={signOut}><LogOut size={16}/> Sign Out</button>
              </div>}
            </div>
          </div>
        </header>
        <main className="ob-portal-main"><Outlet /></main>
      </div>
    </div>
  );
};
