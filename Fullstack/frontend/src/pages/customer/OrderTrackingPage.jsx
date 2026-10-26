import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/api';
import { useSocket } from '../../context/SocketContext';
import { OrderStatusBadge } from '../../components/ui/OrderStatusBadge';
import {
  ArrowLeft,
  Clock,
  MapPin,
  CheckCircle2,
  ChefHat,
  Bell,
  Package,
  Timer,
  QrCode,
  Receipt,
  AlertCircle,
  X,
} from 'lucide-react';

const STEPS = [
  { key: 'Pending', label: 'Order Placed', icon: Package, description: 'Kitchen has received your ticket' },
  { key: 'Confirmed', label: 'Confirmed', icon: CheckCircle2, description: 'Service team has accepted your order' },
  { key: 'Preparing', label: 'Preparing', icon: ChefHat, description: 'Chef is cooking your meal' },
  { key: 'Ready', label: 'Ready for Pickup', icon: Bell, description: 'Collect from counter' },
  { key: 'Picked Up', label: 'Picked Up', icon: CheckCircle2, description: 'Enjoy your meal!' },
];

export const OrderTrackingPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { socket, joinOrderRoom, leaveOrderRoom, orderTrackingData } = useSocket();

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eta, setEta] = useState(null);
  const [liveMessage, setLiveMessage] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);

  const [etaCountdown, setEtaCountdown] = useState(null);

  // Fetch order details
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.getOrderById(orderId);
        if (res.success && res.order) {
          setOrder(res.order);
          setEta(res.order.estimatedReadyTime || null);
        }
      } catch (err) {
        setError(err.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId]);

  // Join order tracking room
  useEffect(() => {
    if (orderId) {
      joinOrderRoom(orderId);
    }
    return () => {
      if (orderId) {
        leaveOrderRoom(orderId);
      }
    };
  }, [orderId, joinOrderRoom, leaveOrderRoom]);

  // Listen for real-time tracking data from context
  useEffect(() => {
    const trackingInfo = orderTrackingData[orderId];
    if (trackingInfo) {
      setOrder((prev) => prev ? { ...prev, status: trackingInfo.status, estimatedReadyTime:trackingInfo.eta ?? prev.estimatedReadyTime } : prev);
      if (trackingInfo.eta !== undefined) setEta(trackingInfo.eta);
      if (trackingInfo.message) setLiveMessage(trackingInfo.message);
    }
  }, [orderTrackingData, orderId]);

  // Also listen directly on socket for status updates
  useEffect(() => {
    if (!socket) return;

    const handleStatusUpdate = (data) => {
      if (data.orderId === orderId || data.order?._id === orderId) {
        setOrder((prev) => prev ? { ...prev, ...(data.order || {}), status: data.status } : prev);
        if (data.order?.estimatedReadyTime) setEta(data.order.estimatedReadyTime);
      }
    };

    socket.on('order_status_updated', handleStatusUpdate);
    return () => socket.off('order_status_updated', handleStatusUpdate);
  }, [socket, orderId]);

  // Countdown is based on the ETA set by the service team, never a fabricated 15 minute timer.
  useEffect(() => {
    if (!eta || ['Ready','Picked Up','Cancelled'].includes(order?.status)) { setEtaCountdown(null);return; }
    const tick=()=>setEtaCountdown(Math.max(0,Math.ceil((new Date(eta).getTime()-Date.now())/1000)));
    tick();
    const timer=setInterval(tick,1000);
    return ()=>clearInterval(timer);
  }, [eta,order?.status]);

  const formatCountdown = (seconds) => {
    if (!seconds || seconds <= 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="max-width-container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            border: '3px solid #edf0f3',
            borderTopColor: '#b32638',
            margin: '0 auto 1.5rem',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <p style={{ color: '#64748b' }}>Loading order tracking...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="max-width-container" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <AlertCircle size={48} color="#dc2626" style={{ marginBottom: '1rem' }} />
        <h2 style={{ fontSize: '1.3rem', fontWeight: '800', marginBottom: '0.5rem' }}>
          Order Not Found
        </h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{error}</p>
        <Link to="/my-orders" className="btn btn-primary">
          Back to My Orders
        </Link>
      </div>
    );
  }

  const currentStepIdx = STEPS.findIndex((s) => s.key === order.status);
  const isCancelled = order.status === 'Cancelled';

  return (
    <div className="max-width-container" style={{ paddingTop: '2rem', paddingBottom: '5rem' }}>
      {/* Back Navigation */}
      <Link
        to="/my-orders"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.85rem',
          fontWeight: '600',
          color: '#64748b',
          marginBottom: '1.5rem',
        }}
      >
        <ArrowLeft size={14} /> Back to My Orders
      </Link>

      {/* Header Card */}
      <div
        style={{
          background: 'linear-gradient(135deg, #3c0921 0%, #581832 100%)',
          borderRadius: '24px',
          padding: '2rem 2.25rem',
          color: '#ffffff',
          marginBottom: '2rem',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Decoration */}
        <div
          style={{
            position: 'absolute',
            top: '-30px',
            right: '-20px',
            width: '180px',
            height: '180px',
            borderRadius: '50%',
            background: 'rgba(255,87,34,0.08)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-40px',
            left: '-20px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(255,87,34,0.05)',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1.25rem',
            }}
          >
            <div>
              <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
                Live Order Tracking
              </div>
              <div style={{ fontFamily: 'var(--font-heading)', fontSize: '2rem', fontWeight: '800' }}>
                #{order.orderNumber}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {!isCancelled && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    background: 'rgba(255,255,255,0.1)',
                    padding: '0.5rem 1rem',
                    borderRadius: '12px',
                  }}
                >
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#10b981',
                      display: 'inline-block',
                      animation: 'pulse 2s infinite',
                    }}
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: '600' }}>LIVE</span>
                </div>
              )}
              <OrderStatusBadge status={order.status} />
            </div>
          </div>

          {/* ETA Display */}
          {!isCancelled && order.status !== 'Picked Up' && etaCountdown > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                background: 'rgba(255,255,255,0.08)',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  background: 'rgba(255,87,34,0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Timer size={24} color="#b32638" />
              </div>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
                  ESTIMATED TIME
                </div>
                <div style={{ fontSize: '1.5rem', fontWeight: '800', fontFamily: 'var(--font-heading)' }}>
                  {formatCountdown(etaCountdown)}
                </div>
              </div>
              {liveMessage && (
                <div
                  style={{
                    marginLeft: 'auto',
                    fontSize: '0.85rem',
                    color: 'rgba(255,255,255,0.7)',
                    fontWeight: '500',
                  }}
                >
                  {liveMessage}
                </div>
              )}
            </div>
          )}

          {/* Ready Banner */}
          {order.status === 'Ready' && (
            <div
              style={{
                background: 'rgba(16,185,129,0.15)',
                borderRadius: '14px',
                padding: '1rem 1.25rem',
                border: '1px solid rgba(16,185,129,0.25)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <Bell size={24} color="#10b981" />
              <div>
                <div style={{ fontWeight: '800', fontSize: '1.05rem' }}>
                  🔔 Your order is ready!
                </div>
                <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                  Please collect from {order.pickupCounter} • OTP: <strong>{order.pickupOtp}</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Left: Live Progress Tracker */}
        <div
          className="card-elevated"
          style={{
            padding: '2rem',
            borderRadius: '22px',
            background: '#ffffff',
          }}
        >
          <h3 style={{ fontSize: '1.1rem', fontWeight: '800', marginBottom: '2rem', color: '#18181b' }}>
            Order Progress
          </h3>

          {isCancelled ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  background: '#fef2f2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 1rem',
                }}
              >
                <X size={28} />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#dc2626', marginBottom: '0.4rem' }}>
                Order Cancelled
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b' }}>
                {order.cancellationReason || 'This order has been cancelled'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
              {STEPS.map((step, idx) => {
                const isDone = currentStepIdx >= idx;
                const isCurrent = currentStepIdx === idx;
                const Icon = step.icon;
                const isLast = idx === STEPS.length - 1;

                return (
                  <div key={step.key} style={{ display: 'flex', gap: '1rem', position: 'relative' }}>
                    {/* Vertical Line */}
                    {!isLast && (
                      <div
                        style={{
                          position: 'absolute',
                          left: '19px',
                          top: '40px',
                          bottom: 0,
                          width: '3px',
                          background: isDone ? '#10b981' : '#edf0f3',
                          transition: 'background 0.5s ease',
                        }}
                      />
                    )}

                    {/* Circle */}
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: isDone ? '#10b981' : isCurrent ? '#fff0f1' : '#f8f9fa',
                        border: isDone
                          ? '3px solid #10b981'
                          : isCurrent
                          ? '3px solid #b32638'
                          : '2px solid #e2e8f0',
                        color: isDone ? '#ffffff' : isCurrent ? '#b32638' : '#94a3b8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        zIndex: 2,
                        transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isCurrent ? '0 0 0 6px rgba(255,87,34,0.1)' : 'none',
                      }}
                    >
                      <Icon size={18} />
                    </div>

                    {/* Content */}
                    <div style={{ paddingBottom: isLast ? 0 : '2rem', flex: 1 }}>
                      <div
                        style={{
                          fontWeight: isCurrent ? '800' : '650',
                          fontSize: isCurrent ? '1.05rem' : '0.95rem',
                          color: isDone ? '#18181b' : isCurrent ? '#b32638' : '#94a3b8',
                          marginBottom: '0.2rem',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        {step.label}
                        {isCurrent && (
                          <span
                            style={{
                              marginLeft: '0.5rem',
                              fontSize: '0.72rem',
                              fontWeight: '700',
                              color: '#ffffff',
                              background: '#b32638',
                              padding: '0.15rem 0.55rem',
                              borderRadius: '9999px',
                              animation: 'pulse 2s infinite',
                            }}
                          >
                            NOW
                          </span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: '0.82rem',
                          color: isDone || isCurrent ? '#64748b' : '#c4c7cc',
                        }}
                      >
                        {step.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Order Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Pickup Info Card */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '18px',
              background: '#ffffff',
            }}
          >
            <h3 style={{ fontSize: '1.05rem', fontWeight: '800', marginBottom: '1rem' }}>
              Pickup Information
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#fff0f1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Clock size={18} color="#b32638" />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Pickup Time</div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{order.pickupTime}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#ecfdf5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MapPin size={18} color="#059669" />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Counter</div>
                  <div style={{ fontWeight: '700', fontSize: '0.95rem' }}>{order.pickupCounter}</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: '#fffbeb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <QrCode size={18} color="#d97706" />
                </div>
                <div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Pickup OTP</div>
                  <div
                    style={{
                      fontWeight: '800',
                      fontSize: '1.35rem',
                      fontFamily: 'var(--font-heading)',
                      color: '#b32638',
                      letterSpacing: '0.15em',
                    }}
                  >
                    {order.pickupOtp || '----'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Card */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              borderRadius: '18px',
              background: '#ffffff',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '1rem',
              }}
            >
              <h3 style={{ fontSize: '1.05rem', fontWeight: '800' }}>Order Items</h3>
              <button
                onClick={() => setShowReceipt(true)}
                className="btn btn-secondary btn-sm"
                style={{ borderRadius: '8px', fontSize: '0.78rem' }}
              >
                <Receipt size={14} /> Receipt
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.6rem 0',
                    borderBottom: idx < order.items.length - 1 ? '1px solid #f4f5f7' : 'none',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                    <span
                      style={{
                        fontWeight: '750',
                        fontSize: '0.85rem',
                        color: '#b32638',
                        background: '#fff0f1',
                        padding: '0.15rem 0.45rem',
                        borderRadius: '6px',
                      }}
                    >
                      {item.quantity}x
                    </span>
                    <div>
                      <div style={{ fontWeight: '650', fontSize: '0.92rem' }}>{item.name}</div>
                      {item.instructions && (
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic' }}>
                          "{item.instructions}"
                        </div>
                      )}
                    </div>
                  </div>
                  <span style={{ fontWeight: '750', fontSize: '0.92rem' }}>
                    ₹{item.price * item.quantity}
                  </span>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div
              style={{
                borderTop: '1px dashed #e2e8f0',
                marginTop: '0.75rem',
                paddingTop: '0.75rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                <span>Subtotal</span>
                <span>₹{order.subtotal}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                <span>GST (5%)</span>
                <span>₹{order.tax}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontWeight: '800',
                  fontSize: '1.1rem',
                  marginTop: '0.25rem',
                  color: '#18181b',
                }}
              >
                <span>Total</span>
                <span style={{ color: '#b32638' }}>₹{order.total}</span>
              </div>
            </div>

            {/* Payment Info */}
            <div
              style={{
                marginTop: '1rem',
                padding: '0.75rem',
                borderRadius: '12px',
                background: '#f8f9fa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.85rem',
              }}
            >
              <span style={{ color: '#64748b' }}>{order.paymentMethod}</span>
              <span
                style={{
                  fontWeight: '700',
                  color: order.paymentStatus === 'Paid' ? '#059669' : '#f59e0b',
                }}
              >
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '1rem',
          }}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '440px',
              padding: '2rem',
              borderRadius: '20px',
              background: '#ffffff',
              position: 'relative',
            }}
          >
            <button
              onClick={() => setShowReceipt(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', color: '#64748b', padding: '6px' }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: '800', fontSize: '1.35rem', color: '#18181b' }}>
                Office<span style={{ color: '#b32638' }}>Bite</span> Cafeteria
              </div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Official Corporate Meal Voucher</div>
              <div style={{ marginTop: '0.5rem', fontWeight: '750', fontSize: '1rem', color: '#b32638' }}>
                Order #{order.orderNumber}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #e2e8f0', borderBottom: '1px dashed #e2e8f0', padding: '1rem 0', margin: '1rem 0' }}>
              {order.items.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', marginBottom: '0.3rem' }}>
                  <span>{item.quantity}x {item.name}</span>
                  <span style={{ fontWeight: '700' }}>₹{item.price * item.quantity}</span>
                </div>
              ))}

              <div style={{ borderTop: '1px solid #f4f5f7', marginTop: '0.75rem', paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                  <span>Subtotal</span><span>₹{order.subtotal}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#64748b' }}>
                  <span>GST (5%)</span><span>₹{order.tax}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '800', marginTop: '0.35rem' }}>
                  <span>Grand Total</span>
                  <span style={{ color: '#b32638' }}>₹{order.total}</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              <div>Counter: <strong>{order.pickupCounter}</strong></div>
              <div>Pickup Time: <strong>{order.pickupTime}</strong></div>
              <div>Payment Mode: <strong>{order.paymentMethod}</strong></div>
              <div>Status: <strong>{order.status}</strong></div>
            </div>

            <button
              onClick={() => window.print()}
              className="btn btn-secondary"
              style={{ width: '100%', borderRadius: '10px' }}
            >
              Print Receipt
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
