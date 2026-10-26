import React from 'react';
import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div
        style={{
          minHeight: '60vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '4px solid #eee7db',
            borderTopColor: '#d9532f',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: '#6b635c', fontSize: '0.9rem' }}>Verifying permissions...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div
        className="max-width-container"
        style={{
          padding: '4rem 1rem',
          maxWidth: '560px',
          textAlign: 'center',
        }}
      >
        <div
          className="card"
          style={{
            padding: '2.5rem 2rem',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <ShieldAlert size={32} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem', color: '#1e1915' }}>
            Access Restricted
          </h2>
          <p style={{ color: '#6b635c', fontSize: '0.92rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
            This page requires <strong>{allowedRoles.join(' or ')}</strong> privileges. Your current role is{' '}
            <span style={{ textTransform: 'capitalize', fontWeight: '700', color: '#d9532f' }}>
              {user.role}
            </span>
            . Use the top switcher bar to test as Admin or Staff.
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
            <Link to="/" className="btn btn-secondary">
              <ArrowLeft size={16} /> Return to Cafeteria
            </Link>
            <Link to="/login" className="btn btn-primary">
              Switch Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return children;
};
