import React from 'react';

export const StatCard = ({ title, value, icon: Icon, trend, subtitle, color = '#b32638' }) => {
  return (
    <div
      className="card"
      style={{
        padding: '1.25rem',
        borderRadius: '16px',
        background: '#ffffff',
        border: '1px solid #eee7db',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
        <div>
          <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#6b635c', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {title}
          </span>
          <div
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '1.85rem',
              fontWeight: '800',
              color: '#3c0921',
              marginTop: '0.2rem',
              lineHeight: 1.1,
            }}
          >
            {value}
          </div>
        </div>

        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '12px',
            background: `${color}15`,
            color: color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={24} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem' }}>
        {subtitle && <span style={{ color: '#6b635c' }}>{subtitle}</span>}
        {trend && (
          <span
            style={{
              color: trend.startsWith('+') ? '#059669' : '#dc2626',
              background: trend.startsWith('+') ? '#ecfdf5' : '#fef2f2',
              padding: '0.15rem 0.5rem',
              borderRadius: '9999px',
              fontWeight: '700',
              fontSize: '0.75rem',
            }}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};
