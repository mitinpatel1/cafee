import React from 'react';
import { Clock, ChefHat, Bell, CheckCircle2, XCircle } from 'lucide-react';

export const OrderStatusBadge = ({ status }) => {
  const configs = {
    Pending: {
      label: 'Pending',
      icon: Clock,
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      style: {
        background: '#fffbeb',
        color: '#b45309',
        border: '1px solid #fde68a',
      },
    },
    Confirmed: {
      label: 'Confirmed',
      icon: CheckCircle2,
      style: {
        background: '#fff5e9',
        color: '#b95a00',
        border: '1px solid #f9d7b2',
      },
    },
    Preparing: {
      label: 'Preparing',
      icon: ChefHat,
      style: {
        background: '#fff6f4',
        color: '#c2410c',
        border: '1px solid #f6cbd0',
      },
    },
    Ready: {
      label: 'Ready for Pickup',
      icon: Bell,
      style: {
        background: '#ecfdf5',
        color: '#047857',
        border: '1px solid #a7f3d0',
      },
    },
    'Picked Up': {
      label: 'Picked Up',
      icon: CheckCircle2,
      style: {
        background: '#f0fdf4',
        color: '#15803d',
        border: '1px solid #bbf7d0',
      },
    },
    Completed: {
      label: 'Completed',
      icon: CheckCircle2,
      style: {
        background: '#f0fdf4',
        color: '#15803d',
        border: '1px solid #bbf7d0',
      },
    },
    Cancelled: {
      label: 'Cancelled',
      icon: XCircle,
      style: {
        background: '#fef2f2',
        color: '#b91c1c',
        border: '1px solid #fecaca',
      },
    },
  };

  const config = configs[status] || configs.Pending;
  const Icon = config.icon;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.35rem',
        padding: '0.3rem 0.75rem',
        borderRadius: '9999px',
        fontSize: '0.8rem',
        fontWeight: '600',
        lineHeight: 1,
        ...config.style,
      }}
    >
      <Icon size={14} />
      {config.label}
    </span>
  );
};
