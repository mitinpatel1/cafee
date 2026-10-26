import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Utensils,
  ClipboardList,
  Boxes,
  BarChart3,
  ArrowLeft,
  LogOut,
  Shield,
  ChefHat,
} from 'lucide-react';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
    { to: '/admin/orders', label: 'Manage Orders', icon: ClipboardList },
    { to: '/admin/menu', label: 'Manage Menu', icon: Utensils },
    { to: '/admin/inventory', label: 'Inventory & Stock', icon: Boxes },
    { to: '/admin/reports', label: 'Sales Reports', icon: BarChart3 },
  ];

  return (
    <aside
      style={{
        width: '260px',
        minHeight: '100vh',
        background: '#1e1915',
        color: '#f7f4ed',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        boxShadow: '4px 0 16px rgba(0, 0, 0, 0.08)',
        flexShrink: 0,
      }}
    >
      {/* Brand & Portal Header */}
      <div style={{ padding: '0 0.5rem 1.5rem', borderBottom: '1px solid #332b24' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              background: '#d9532f',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
            }}
          >
            {user?.role === 'staff' ? <ChefHat size={20} /> : <Shield size={20} />}
          </div>
          <div>
            <div
              style={{
                fontFamily: 'var(--font-heading)',
                fontWeight: '800',
                fontSize: '1.15rem',
                color: '#ffffff',
                letterSpacing: '-0.02em',
              }}
            >
              Office<span style={{ color: '#d9532f' }}>Bite</span>
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                color: '#e59838',
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              {user?.role === 'staff' ? 'Kitchen Portal' : 'Admin Operations'}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ margin: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                fontSize: '0.925rem',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? '#ffffff' : '#b2a79b',
                background: isActive ? '#d9532f' : 'transparent',
                transition: 'all 0.2s',
                textDecoration: 'none',
              })}
            >
              <Icon size={18} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Return to Employee Cafeteria Menu */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid #332b24', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            background: '#2b231d',
            color: '#e0d5c3',
            fontSize: '0.85rem',
            fontWeight: '600',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          View Employee Menu
        </Link>

        {/* Current user & Logout */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.5rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                background: '#e59838',
                color: '#1e1915',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
              }}
            >
              {user?.name ? user.name[0] : 'A'}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#ffffff' }}>
                {user?.name?.split(' ')[0]}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#9c9288', textTransform: 'capitalize' }}>
                {user?.role}
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            title="Log Out"
            style={{
              color: '#ef4444',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
