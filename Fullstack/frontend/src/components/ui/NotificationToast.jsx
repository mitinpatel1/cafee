import React from 'react';
import { useSocket } from '../../context/SocketContext';
import { Bell, CheckCircle2, X } from 'lucide-react';
import { Link } from 'react-router-dom';

export const NotificationToast = () => {
  const { activeAlert, dismissAlert } = useSocket();

  if (!activeAlert) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 9999,
        background: '#ffffff',
        border: '1px solid #edcbd6',
        borderRadius: '16px',
        padding: '1rem 1.25rem',
        boxShadow: '0 20px 35px -6px rgba(43, 35, 29, 0.15)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.85rem',
        maxWidth: '380px',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      <div
        style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: activeAlert.type === 'status_update' ? '#ecfdf5' : '#fff6f4',
          color: activeAlert.type === 'status_update' ? '#059669' : '#ea580c',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {activeAlert.type === 'status_update' ? <CheckCircle2 size={20} /> : <Bell size={20} />}
      </div>

      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '0.95rem', fontWeight: '700', marginBottom: '2px', color: '#3c0921' }}>
          {activeAlert.title}
        </h4>
        <p style={{ fontSize: '0.85rem', color: '#6b635c', marginBottom: '6px' }}>
          {activeAlert.message}
        </p>
        <Link
          to="/my-orders"
          onClick={dismissAlert}
          style={{
            fontSize: '0.8rem',
            fontWeight: '600',
            color: '#b32638',
            textDecoration: 'underline',
          }}
        >
          View Live Tracking →
        </Link>
      </div>

      <button
        onClick={dismissAlert}
        style={{
          color: '#9c9288',
          padding: '4px',
          borderRadius: '6px',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};
