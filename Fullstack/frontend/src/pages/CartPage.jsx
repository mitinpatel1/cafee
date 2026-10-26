import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import {
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export const CartPage = () => {
  const { cartItems, itemCount, subtotal, total, updateQuantity, removeFromCart, clearCart } = useCart();
  const navigate = useNavigate();

  if (cartItems.length === 0) {
    return (
      <div className="max-width-container" style={{ padding: '5rem 1rem', textAlign: 'center', maxWidth: '480px' }}>
        <div className="card" style={{ padding: '3rem 2rem', borderRadius: '20px', background: '#ffffff' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: '#fff2ee',
              color: '#ff5722',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <ShoppingBag size={28} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.4rem', color: '#18181b' }}>
            Your Cart is Empty
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Looks like you haven't added any meals or beverages yet.
          </p>
          <Link to="/menu" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem' }}>
            Browse Menu <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-width-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      {/* Title */}
      <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#18181b', marginBottom: '1.75rem' }}>
        Your Cart ({itemCount} {itemCount === 1 ? 'item' : 'items'})
      </h1>

      {/* 2-Column Layout matching Panel 3 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left: Cart Items List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {cartItems.map((item) => (
            <div
              key={item.menuItemId}
              className="card"
              style={{
                padding: '1.25rem 1.5rem',
                borderRadius: '16px',
                background: '#ffffff',
                border: '1px solid #edf0f3',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              {/* Image & Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flex: 1, minWidth: '200px' }}>
                <img
                  src={item.image}
                  alt={item.name}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '12px',
                    objectFit: 'cover',
                  }}
                />
                <div>
                  <h3 style={{ fontSize: '1rem', fontWeight: '750', color: '#18181b', marginBottom: '0.2rem' }}>
                    {item.name}
                  </h3>
                  <div style={{ fontSize: '0.9rem', fontWeight: '800', color: '#18181b' }}>
                    ₹{item.price}
                  </div>
                </div>
              </div>

              {/* Quantity Stepper & Delete Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                {/* Stepper [ - 1 + ] */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.6rem',
                    background: '#f8f9fa',
                    border: '1px solid #edf0f3',
                    borderRadius: '10px',
                    padding: '0.25rem 0.5rem',
                  }}
                >
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                    style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                    }}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontWeight: '750', fontSize: '0.92rem', minWidth: '18px', textAlign: 'center' }}>
                    {item.quantity}
                  </span>
                  <button
                    onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                    style={{
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#64748b',
                    }}
                  >
                    <Plus size={14} />
                  </button>
                </div>

                {/* Trash Icon */}
                <button
                  onClick={() => removeFromCart(item.menuItemId)}
                  style={{
                    color: '#94a3b8',
                    padding: '6px',
                    cursor: 'pointer',
                  }}
                  title="Remove item"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          ))}

          {/* Continue Shopping Link */}
          <div style={{ marginTop: '0.5rem' }}>
            <Link
              to="/menu"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.88rem',
                fontWeight: '700',
                color: '#ff5722',
              }}
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>

        {/* Right: Order Summary Card */}
        <div
          className="card"
          style={{
            padding: '1.75rem',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid #edf0f3',
            boxShadow: 'var(--shadow-sm)',
          }}
        >
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#18181b', marginBottom: '1.25rem' }}>
            Order Summary
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.92rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
              <span>Subtotal</span>
              <span style={{ fontWeight: '700', color: '#18181b' }}>₹{subtotal}</span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b' }}>
              <span>Delivery/Pickup</span>
              <span style={{ fontWeight: '700', color: '#16a34a' }}>Free</span>
            </div>

            <div
              style={{
                borderTop: '1px solid #edf0f3',
                paddingTop: '0.85rem',
                marginTop: '0.35rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#18181b' }}>
                Total
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#ff5722',
                }}
              >
                ₹{subtotal}
              </span>
            </div>
          </div>

          {/* Orange Proceed to Checkout Pill Button */}
          <button
            onClick={() => navigate('/checkout')}
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '0.85rem',
              borderRadius: '9999px',
              fontSize: '0.95rem',
              fontWeight: '750',
              marginTop: '1.5rem',
              boxShadow: '0 8px 24px -4px rgba(255, 87, 34, 0.4)',
            }}
          >
            Proceed to Checkout →
          </button>

          {/* Reassurance Callout Box from Mockup */}
          <div
            style={{
              marginTop: '1.5rem',
              padding: '1rem',
              borderRadius: '14px',
              background: '#fff7ed',
              border: '1px solid #ffedd5',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: '#ffedd5',
                color: '#ff5722',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ShieldCheck size={18} />
            </div>

            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '750', color: '#9a3412', marginBottom: '2px' }}>
                You're almost there!
              </div>
              <div style={{ fontSize: '0.78rem', color: '#c2410c', lineHeight: 1.4 }}>
                Complete your order and pay at the counter with Cash or UPI.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
