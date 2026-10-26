import React from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Building2,
  Users,
  BarChart3,
  Utensils,
  Boxes,
  ArrowLeft,
  LogOut,
  Crown,
  ClipboardList,
} from 'lucide-react';

export const FranchiseSidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: '/franchise/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
    { to: '/franchise/branches', label: 'My Franchise', icon: Building2 },
    { to: '/franchise/orders', label: 'Customer Orders', icon: ClipboardList },
    { to: '/franchise/menu', label: 'Manage Daily Menu', icon: Utensils },
  ];

  return (
    <aside
      style={{
        width: '270px',
        minHeight: '100vh',
        background: 'linear-gradient(180deg, #730042 0%, #590032 50%, #380020 100%)',
        color: '#f7f4ed',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 1rem',
        boxShadow: '4px 0 24px rgba(0, 0, 0, 0.15)',
        flexShrink: 0,
      }}
    >
      {/* Brand Header */}
      <div style={{ padding: '0 0.5rem 1.5rem', borderBottom: '1px solid #672c47' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #a60c56, #761531)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)',
            }}
          >
            <Crown size={20} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-heading)', fontWeight: '800', fontSize: '1.15rem', color: '#ffffff', letterSpacing: '-0.02em' }}>
              Office<span style={{ color: '#f3b4c3' }}>Bite</span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#f3b4c3', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Franchise Portal
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ margin: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
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
                fontSize: '0.92rem',
                fontWeight: isActive ? '700' : '500',
                color: isActive ? '#ffffff' : '#f3b4c3',
                background: isActive ? 'linear-gradient(135deg, #a60c56, #761531)' : 'transparent',
                transition: 'all 0.2s',
                textDecoration: 'none',
                boxShadow: isActive ? '0 4px 12px rgba(124, 58, 237, 0.25)' : 'none',
              })}
            >
              <Icon size={18} />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid #672c47', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            background: '#5a1737',
            color: '#f6cad5',
            fontSize: '0.85rem',
            fontWeight: '600',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={16} />
          View Cafeteria Menu
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: 'linear-gradient(135deg, #a60c56, #f3b4c3)', color: '#fff', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem' }}>
              {user?.name ? user.name[0] : 'F'}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#ffffff' }}>{user?.name?.split(' ')[0]}</div>
              <div style={{ fontSize: '0.68rem', color: '#f3b4c3' }}>Franchise Owner</div>
            </div>
          </div>
          <button
            onClick={() => { logout(); navigate('/franchise/login'); }}
            title="Log Out"
            style={{ color: '#ef4444', padding: '6px', borderRadius: '8px' }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
