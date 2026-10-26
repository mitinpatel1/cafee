import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/api';
import { PaymentModal } from '../components/PaymentModal';
import {
  Clock,
  MapPin,
  CreditCard,
  Building,
  QrCode,
  Banknote,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ShieldCheck,
  Wallet,
} from 'lucide-react';

export const CheckoutPage = () => {
  const { cartItems, itemCount, subtotal, tax, total, clearCart } = useCart();
  const { user, rechargeWallet } = useAuth();
  const navigate = useNavigate();

  const [pickupTime, setPickupTime] = useState('Ready in 15 mins (ASAP)');
  const [pickupCounter, setPickupCounter] = useState('Counter 1 — Express & Meals');
  const [paymentMethod, setPaymentMethod] = useState('Cafeteria Wallet');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rechargeSuccess, setRechargeSuccess] = useState('');

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);

  if (cartItems.length === 0) {
    return (
      <div className="max-width-container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <p>No items in cart.</p>
        <Link to="/menu" className="btn btn-primary" style={{ marginTop: '1rem' }}>
          Browse Menu
        </Link>
      </div>
    );
  }

  const timeSlots = [
    'Ready in 15 mins (ASAP)',
    '12:45 PM',
    '1:00 PM',
    '1:15 PM',
    '1:30 PM',
    '2:00 PM',
  ];

  const counters = [
    { id: 'Counter 1 — Express & Meals', name: 'Counter 1', desc: 'Main Food Station (Hot Bowls & Combos)' },
    { id: 'Counter 2 — Quick Snacks & Wraps', name: 'Counter 2', desc: 'Sandwich, Fries & Snack Station' },
    { id: 'Counter 3 — Artisan Coffee & Salads', name: 'Counter 3', desc: 'Beverage Bar & Fresh Green Salads' },
  ];

  const paymentOptions = [
    {
      id: 'Cafeteria Wallet',
      title: 'Cafeteria Smart Card',
      desc: `Prepaid wallet balance: ₹${user?.balance || 0}`,
      icon: Wallet,
      badge: user?.balance >= total ? 'Sufficient Balance' : 'Low Balance',
      badgeColor: user?.balance >= total ? '#059669' : '#dc2626',
    },
    {
      id: 'Payroll Deduction',
      title: 'Corporate Payroll Deduction',
      desc: 'Auto-deducted from next monthly salary slip',
      icon: Building,
      badge: 'Company Perk',
      badgeColor: '#d9532f',
    },
    {
      id: 'UPI / QR',
      title: 'UPI / QR Code',
      desc: 'Instant GooglePay, PhonePe, Paytm QR',
      icon: QrCode,
      badge: 'Instant',
      badgeColor: '#2563eb',
    },
    {
      id: 'Cash on Pickup',
      title: 'Cash at Counter',
      desc: 'Pay physical cash when collecting tray',
      icon: Banknote,
      badge: 'Counter',
      badgeColor: '#6b635c',
    },
  ];

  const handleQuickRecharge = async (amt) => {
    try {
      await rechargeWallet(amt);
      setRechargeSuccess(`Added ₹${amt} to your cafeteria wallet!`);
      setTimeout(() => setRechargeSuccess(''), 3000);
    } catch (err) {
      setError(err.message || 'Recharge failed');
    }
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const orderPayload = {
        items: cartItems.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          instructions: item.instructions,
        })),
        pickupTime,
        pickupCounter,
        paymentMethod,
        notes,
      };

      const res = await api.createOrder(orderPayload);
      if (res.success && res.order) {
        // For UPI/QR and Payroll Deduction — show payment modal
        if (paymentMethod === 'UPI / QR' || paymentMethod === 'Payroll Deduction') {
          setCreatedOrder(res.order);
          setShowPaymentModal(true);
          setLoading(false);
          return;
        }

        // For Cafeteria Wallet and Cash on Pickup — direct success
        clearCart();
        navigate(`/track/${res.order._id}`);
      }
    } catch (err) {
      setError(err.message || 'Failed to place order. Please review your details.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = (paymentRes) => {
    setShowPaymentModal(false);
    clearCart();
    navigate(`/track/${createdOrder._id}`);
  };

  const handlePaymentClose = () => {
    setShowPaymentModal(false);
    // Order is already created, redirect to tracking even if payment is pending
    if (createdOrder) {
      clearCart();
      navigate(`/track/${createdOrder._id}`);
    }
  };

  return (
    <div className="max-width-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <Link
          to="/cart"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontSize: '0.85rem',
            color: '#6b635c',
            fontWeight: '600',
            marginBottom: '0.5rem',
          }}
        >
          <ArrowLeft size={14} /> Back to Cart Tray
        </Link>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#1e1915' }}>
          Schedule Pickup & Confirm Order
        </h1>
        <p style={{ color: '#6b635c', fontSize: '0.95rem' }}>
          Select your preferred counter station, pickup time, and corporate payment mode.
        </p>
      </div>

      {error && (
        <div
          style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#b91c1c',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </div>
      )}

      {rechargeSuccess && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '12px',
            padding: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            marginBottom: '1.5rem',
          }}
        >
          <CheckCircle2 size={20} />
          <span>{rechargeSuccess}</span>
        </div>
      )}

      {/* Main Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2.5rem',
          alignItems: 'start',
        }}
      >
        {/* Left Form: Details */}
        <form onSubmit={handlePlaceOrder} style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Section 1: Pickup Time Slot */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '18px',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Clock size={20} color="#d9532f" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>
                1. Select Pickup Time Slot
              </h3>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: '0.65rem',
              }}
            >
              {timeSlots.map((slot) => {
                const isSelected = pickupTime === slot;
                return (
                  <button
                    type="button"
                    key={slot}
                    onClick={() => setPickupTime(slot)}
                    style={{
                      padding: '0.75rem 0.65rem',
                      borderRadius: '12px',
                      fontSize: '0.85rem',
                      fontWeight: isSelected ? '700' : '500',
                      background: isSelected ? '#fff2ee' : '#fbf9f5',
                      border: isSelected ? '2px solid #d9532f' : '1px solid #eee7db',
                      color: isSelected ? '#d9532f' : '#2b231d',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.2s',
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Pickup Counter */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '18px',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <MapPin size={20} color="#d9532f" />
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>
                2. Select Cafeteria Counter
              </h3>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {counters.map((c) => {
                const isSelected = pickupCounter === c.id;
                return (
                  <label
                    key={c.id}
                    onClick={() => setPickupCounter(c.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.9rem 1.15rem',
                      borderRadius: '14px',
                      background: isSelected ? '#fff2ee' : '#fbf9f5',
                      border: isSelected ? '2px solid #d9532f' : '1px solid #eee7db',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <input
                        type="radio"
                        name="pickupCounter"
                        checked={isSelected}
                        onChange={() => setPickupCounter(c.id)}
                        style={{ accentColor: '#d9532f', width: '18px', height: '18px' }}
                      />
                      <div>
                        <div style={{ fontWeight: '750', fontSize: '0.95rem', color: '#1e1915' }}>
                          {c.name}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b635c' }}>{c.desc}</div>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Section 3: Payment Method */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '18px',
              background: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CreditCard size={20} color="#d9532f" />
                <h3 style={{ fontSize: '1.15rem', fontWeight: '800' }}>
                  3. Select Payment Method
                </h3>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {paymentOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = paymentMethod === opt.id;
                return (
                  <div
                    key={opt.id}
                    onClick={() => setPaymentMethod(opt.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '1rem 1.15rem',
                      borderRadius: '14px',
                      background: isSelected ? '#fff2ee' : '#fbf9f5',
                      border: isSelected ? '2px solid #d9532f' : '1px solid #eee7db',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      <input
                        type="radio"
                        name="paymentMethod"
                        checked={isSelected}
                        onChange={() => setPaymentMethod(opt.id)}
                        style={{ accentColor: '#d9532f', width: '18px', height: '18px' }}
                      />
                      <Icon size={22} color={isSelected ? '#d9532f' : '#6b635c'} />
                      <div>
                        <div style={{ fontWeight: '750', fontSize: '0.95rem', color: '#1e1915' }}>
                          {opt.title}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: '#6b635c' }}>{opt.desc}</div>
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        color: opt.badgeColor,
                        background: '#ffffff',
                        padding: '0.2rem 0.55rem',
                        borderRadius: '9999px',
                        border: '1px solid #eee7db',
                      }}
                    >
                      {opt.badge}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Quick Wallet Recharge Shortcut if wallet is selected and low */}
            {paymentMethod === 'Cafeteria Wallet' && user?.balance < total && (
              <div
                style={{
                  marginTop: '1rem',
                  padding: '1rem',
                  background: '#fef2f2',
                  borderRadius: '12px',
                  border: '1px solid #fecaca',
                }}
              >
                <div style={{ fontSize: '0.85rem', color: '#b91c1c', marginBottom: '0.5rem', fontWeight: '600' }}>
                  Your balance is ₹{user?.balance || 0}, but order is ₹{total}. Quick recharge:
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => handleQuickRecharge(200)}
                    className="btn btn-secondary btn-sm"
                  >
                    +₹200
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickRecharge(500)}
                    className="btn btn-secondary btn-sm"
                  >
                    +₹500
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickRecharge(1000)}
                    className="btn btn-secondary btn-sm"
                  >
                    +₹1,000
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Section 4: Special Notes */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '18px',
              background: '#ffffff',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '0.65rem' }}>
              Special Pickup Notes / Packaging Preferences
            </h3>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Please pack in paper bag, extra cutlery, call if ready early"
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '12px',
                border: '1px solid #eee7db',
                background: '#fbf9f5',
                outline: 'none',
                resize: 'none',
              }}
            />
          </div>
        </form>

        {/* Right Summary Card & Submit */}
        <div
          className="card-elevated"
          style={{
            padding: '1.75rem',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid #eee7db',
            position: 'sticky',
            top: '90px',
          }}
        >
          <h3 style={{ fontSize: '1.25rem', fontWeight: '800', marginBottom: '1.25rem', color: '#1e1915' }}>
            Order Confirmation
          </h3>

          {/* Selected Order Summary Items */}
          <div
            style={{
              maxHeight: '180px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.65rem',
              marginBottom: '1rem',
              paddingRight: '0.35rem',
            }}
          >
            {cartItems.map((item) => (
              <div
                key={item.menuItemId}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '0.88rem',
                }}
              >
                <div>
                  <span style={{ fontWeight: '600', color: '#1e1915' }}>{item.quantity}x</span>{' '}
                  <span style={{ color: '#2b231d' }}>{item.name}</span>
                </div>
                <span style={{ fontWeight: '700', color: '#1e1915' }}>
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
          </div>

          <div
            style={{
              borderTop: '1px solid #eee7db',
              paddingTop: '0.85rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
              fontSize: '0.9rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b635c' }}>
              <span>Items Total</span>
              <span>₹{subtotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#6b635c' }}>
              <span>GST (5%)</span>
              <span>₹{tax}</span>
            </div>
            <div
              style={{
                borderTop: '1px dashed #e0d5c3',
                paddingTop: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
              }}
            >
              <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#1e1915' }}>
                Total Amount
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.65rem',
                  fontWeight: '800',
                  color: '#d9532f',
                }}
              >
                ₹{total}
              </span>
            </div>
          </div>

          {/* Pickup Details Pill */}
          <div
            style={{
              background: '#f7f4ed',
              borderRadius: '12px',
              padding: '0.85rem',
              marginTop: '1rem',
              fontSize: '0.82rem',
              color: '#6b635c',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
            }}
          >
            <div>
              🕒 Time: <strong>{pickupTime}</strong>
            </div>
            <div>
              📍 Counter: <strong>{pickupCounter.split('—')[0]}</strong>
            </div>
            <div>
              💳 Pay: <strong>{paymentMethod}</strong>
            </div>
          </div>

          {/* Place Order CTA Button */}
          <button
            onClick={handlePlaceOrder}
            disabled={loading || (paymentMethod === 'Cafeteria Wallet' && user?.balance < total)}
            className="btn btn-primary btn-lg"
            style={{
              width: '100%',
              borderRadius: '14px',
              marginTop: '1.25rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: '0 8px 24px -4px rgba(217, 83, 47, 0.35)',
            }}
          >
            {loading ? 'Confirming Order...' : `Pay ₹${total} & Place Order`}
          </button>

          <div
            style={{
              textAlign: 'center',
              marginTop: '0.85rem',
              fontSize: '0.75rem',
              color: '#9c9288',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.35rem',
            }}
          >
            <ShieldCheck size={14} color="#059669" />
            Backend double checks prices & availability
          </div>
        </div>
      </div>

      {/* Payment Gateway Modal */}
      {showPaymentModal && createdOrder && (
        <PaymentModal
          order={createdOrder}
          paymentMethod={paymentMethod}
          onSuccess={handlePaymentSuccess}
          onClose={handlePaymentClose}
        />
      )}
    </div>
  );
};
