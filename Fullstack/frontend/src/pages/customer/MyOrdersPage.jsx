import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../../api/api';
import { useCart } from '../../context/CartContext';
import { useSocket } from '../../context/SocketContext';
import { OrderStatusBadge } from '../../components/ui/OrderStatusBadge';
import {
  Clock,
  MapPin,
  CheckCircle2,
  ChefHat,
  Bell,
  XCircle,
  Receipt,
  Repeat,
  AlertTriangle,
  QrCode,
  ArrowRight,
  ShieldCheck,
  X,
} from 'lucide-react';

export const MyOrdersPage = ({ historyOnly = false }) => {
  const [searchParams] = useSearchParams();
  const newlyPlacedOrderNumber = searchParams.get('placed');

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [cancellingId, setCancellingId] = useState(null);
  const [actionMessage, setActionMessage] = useState('');

  const { addToCart } = useCart();
  const { socket } = useSocket();

  const fetchOrders = async () => {
    try {
      const res = await api.getMyOrders();
      if (res.success && res.orders) {
        setOrders(res.orders);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Listen to socket order status changes to re-fetch or live update state
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = (data) => {
      setOrders((prevOrders) =>
        prevOrders.map((o) =>
          o._id === data.orderId || o._id === data.order?._id
            ? { ...o, status: data.status }
            : o
        )
      );
    };

    socket.on('order_status_updated', handleUpdate);
    socket.on('order_created', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
    });

    return () => {
      socket.off('order_status_updated', handleUpdate);
      socket.off('order_created');
    };
  }, [socket]);

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order?')) {
      return;
    }

    setCancellingId(orderId);
    try {
      const res = await api.cancelOrder(orderId, 'Cancelled by customer');
      if (res.success) {
        setActionMessage('Order cancelled successfully.');
        fetchOrders();
        setTimeout(() => setActionMessage(''), 4000);
      }
    } catch (err) {
      alert(err.message || 'Could not cancel order');
    } finally {
      setCancellingId(null);
    }
  };

  const handleReorder = (order) => {
    order.items.forEach((item) => {
      addToCart({
        _id: item.menuItemId?._id || item.menuItemId,
        name: item.name,
        price: item.price,
        image: item.image,
      }, item.quantity, item.instructions);
    });
    alert('Items added back to your cart tray!');
  };

  // Active / Ongoing orders vs Past Completed orders
  const activeOrders = orders.filter((o) => ['Pending', 'Confirmed', 'Preparing', 'Ready'].includes(o.status));
  const pastOrders = orders.filter((o) => ['Picked Up', 'Completed', 'Cancelled'].includes(o.status));

  return (
    <div className="max-width-container" style={{ paddingTop: '2.5rem', paddingBottom: '5rem' }}>
      {/* Title */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2.2rem', fontWeight: '800', color: '#3c0921' }}>
          {historyOnly ? "Order History" : "My Cafeteria Orders"}
        </h1>
        <p style={{ color: '#6b635c', fontSize: '0.95rem' }}>
          Track real-time meal preparation, pickup tokens, and past order receipts.
        </p>
      </div>

      {actionMessage && (
        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
          }}
        >
          <CheckCircle2 size={18} /> {actionMessage}
        </div>
      )}

      {newlyPlacedOrderNumber && (
        <div
          style={{
            background: '#fff0f1',
            border: '1px solid #fbd9cf',
            color: '#b32638',
            borderRadius: '14px',
            padding: '1.25rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: '#b32638',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              🎉
            </div>
            <div>
              <div style={{ fontWeight: '800', fontSize: '1rem' }}>
                Order #{newlyPlacedOrderNumber} Confirmed!
              </div>
              <div style={{ fontSize: '0.85rem', color: '#6b635c' }}>
                The cafeteria kitchen has received your ticket and will start preparing shortly.
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '0.8rem',
              fontWeight: '700',
              background: '#ffffff',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
            }}
          >
            Live Tracking Active
          </span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b635c' }}>
          Loading your order history...
        </div>
      ) : orders.length === 0 ? (
        <div
          className="card"
          style={{
            padding: '4rem 2rem',
            textAlign: 'center',
            borderRadius: '20px',
            background: '#ffffff',
          }}
        >
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🍽️</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '800', marginBottom: '0.5rem' }}>
            No Orders Placed Yet
          </h2>
          <p style={{ color: '#6b635c', fontSize: '0.92rem', marginBottom: '1.5rem' }}>
            Explore today's cafeteria menu to order delicious lunch, coffee or snacks!
          </p>
          <Link to="/menu" className="btn btn-primary" style={{ borderRadius: '12px' }}>
            Explore Food Menu <ArrowRight size={16} />
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
          {/* Active Orders Section */}
          {!historyOnly && activeOrders.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '1.25rem' }}>
                <span
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: '#10b981',
                    display: 'inline-block',
                  }}
                  className="pulse-live"
                />
                <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#3c0921' }}>
                  Live Orders in Kitchen ({activeOrders.length})
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {activeOrders.map((order) => {
                  const steps = ['Pending', 'Confirmed', 'Preparing', 'Ready', 'Picked Up'];
                  const currentIdx = steps.indexOf(order.status);

                  return (
                    <div
                      key={order._id}
                      className="card-elevated"
                      style={{
                        padding: '1.75rem',
                        borderRadius: '20px',
                        background: '#ffffff',
                        border: '1px solid #eee7db',
                      }}
                    >
                      {/* Order Header */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          borderBottom: '1px solid #f7f4ed',
                          paddingBottom: '1rem',
                          marginBottom: '1.5rem',
                          flexWrap: 'wrap',
                          gap: '0.75rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <span
                            style={{
                              fontFamily: 'var(--font-heading)',
                              fontSize: '1.35rem',
                              fontWeight: '800',
                              color: '#b32638',
                            }}
                          >
                            #{order.orderNumber}
                          </span>
                          <OrderStatusBadge status={order.status} />
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <button
                            onClick={() => setSelectedReceipt(order)}
                            className="btn btn-secondary btn-sm"
                            style={{ borderRadius: '8px' }}
                          >
                            <Receipt size={14} /> Receipt
                          </button>

                          {order.status === 'Pending' && (
                            <button
                              onClick={() => handleCancelOrder(order._id)}
                              disabled={cancellingId === order._id}
                              style={{
                                color: '#ef4444',
                                background: '#fef2f2',
                                padding: '0.4rem 0.75rem',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                fontWeight: '600',
                              }}
                            >
                              {cancellingId === order._id ? 'Cancelling...' : 'Cancel Order'}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Live Stepper Tracker */}
                      <div style={{ margin: '1.5rem 0 2rem' }}>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(5, 1fr)',
                            position: 'relative',
                            textAlign: 'center',
                          }}
                        >
                          {/* Progress Line */}
                          <div
                            style={{
                              position: 'absolute',
                              top: '16px',
                              left: '12%',
                              right: '12%',
                              height: '4px',
                              background: '#eee7db',
                              zIndex: 1,
                            }}
                          >
                            <div
                              style={{
                                height: '100%',
                                background: '#059669',
                                width: `${(Math.max(0, currentIdx) / (steps.length - 1)) * 100}%`,
                                transition: 'width 0.5s ease',
                              }}
                            />
                          </div>

                          {steps.map((st, idx) => {
                            const isDone = currentIdx >= idx;
                            const isCurrent = currentIdx === idx;
                            return (
                              <div
                                key={st}
                                style={{
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  position: 'relative',
                                  zIndex: 2,
                                }}
                              >
                                <div
                                  style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: '50%',
                                    background: isDone ? '#059669' : '#ffffff',
                                    border: isDone ? '2px solid #059669' : '2px solid #edcbd6',
                                    color: isDone ? '#ffffff' : '#9c9288',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.85rem',
                                    fontWeight: '700',
                                    marginBottom: '0.4rem',
                                    boxShadow: isCurrent ? '0 0 0 4px #ecfdf5' : 'none',
                                  }}
                                >
                                  {isDone ? <CheckCircle2 size={18} /> : idx + 1}
                                </div>
                                <span
                                  style={{
                                    fontSize: '0.78rem',
                                    fontWeight: isCurrent ? '800' : '600',
                                    color: isCurrent ? '#059669' : isDone ? '#3c0921' : '#9c9288',
                                  }}
                                >
                                  {st === 'Ready' ? 'Ready to Pick' : st}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Pickup Info Banner */}
                      <div
                        style={{
                          background: '#f7f4ed',
                          borderRadius: '14px',
                          padding: '1rem 1.25rem',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                          gap: '1rem',
                          marginBottom: '1.25rem',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b635c' }}>PICKUP TIME</div>
                          <div style={{ fontWeight: '750', fontSize: '0.95rem', color: '#3c0921' }}>
                            {order.pickupTime}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b635c' }}>COUNTER</div>
                          <div style={{ fontWeight: '750', fontSize: '0.95rem', color: '#3c0921' }}>
                            {order.pickupCounter}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b635c' }}>PICKUP OTP / CODE</div>
                          <div style={{ fontWeight: '800', fontSize: '1.1rem', color: '#b32638' }}>
                            {order.pickupOtp || '4021'}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.75rem', color: '#6b635c' }}>PAYMENT</div>
                          <div style={{ fontWeight: '700', fontSize: '0.92rem', color: '#059669' }}>
                            ₹{order.total} • {order.paymentMethod}
                          </div>
                        </div>
                      </div>

                      {/* Items List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {order.items.map((it, idx) => (
                          <div
                            key={idx}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.9rem',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                              <span style={{ fontWeight: '700', color: '#b32638' }}>{it.quantity}x</span>
                              <span style={{ fontWeight: '600', color: '#3c0921' }}>{it.name}</span>
                              {it.instructions && (
                                <span style={{ fontSize: '0.78rem', color: '#6b635c', fontStyle: 'italic' }}>
                                  ({it.instructions})
                                </span>
                              )}
                            </div>
                            <span style={{ fontWeight: '700', color: '#3c0921' }}>
                              ₹{it.price * it.quantity}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Orders Archive */}
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: '800', color: '#3c0921', marginBottom: '1.25rem' }}>
              Past Orders History ({pastOrders.length})
            </h2>

            {pastOrders.length === 0 && (
              <div className="caf-note" role="status">No completed or cancelled orders yet.</div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pastOrders.map((order) => (
                <div
                  key={order._id}
                  className="card"
                  style={{
                    padding: '1.25rem',
                    borderRadius: '16px',
                    background: '#ffffff',
                    border: '1px solid #eee7db',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: ['Completed', 'Picked Up'].includes(order.status) ? '#ecfdf5' : '#fef2f2',
                        color: ['Completed', 'Picked Up'].includes(order.status) ? '#059669' : '#dc2626',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {['Completed', 'Picked Up'].includes(order.status) ? <CheckCircle2 size={22} /> : <XCircle size={22} />}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: '800', fontSize: '1rem', color: '#3c0921' }}>
                          #{order.orderNumber}
                        </span>
                        <OrderStatusBadge status={order.status} />
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#6b635c', marginTop: '0.2rem' }}>
                        {new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        • {order.items.length} items
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#3c0921' }}>
                        ₹{order.total}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9c9288' }}>
                        {order.paymentMethod}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => setSelectedReceipt(order)}
                        className="btn btn-secondary btn-sm"
                        style={{ borderRadius: '8px' }}
                      >
                        <Receipt size={14} /> Receipt
                      </button>
                      <button
                        onClick={() => handleReorder(order)}
                        className="btn btn-primary btn-sm"
                        style={{ borderRadius: '8px' }}
                      >
                        <Repeat size={14} /> Reorder
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {selectedReceipt && (
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
              onClick={() => setSelectedReceipt(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                color: '#6b635c',
                padding: '6px',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{ fontWeight: '800', fontSize: '1.35rem', color: '#3c0921' }}>
                Office<span style={{ color: '#b32638' }}>Bite</span> Cafeteria
              </div>
              <div style={{ fontSize: '0.8rem', color: '#6b635c' }}>
                Official Corporate Meal Voucher
              </div>
              <div style={{ marginTop: '0.5rem', fontWeight: '750', fontSize: '1rem', color: '#b32638' }}>
                Order #{selectedReceipt.orderNumber}
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #edcbd6', borderBottom: '1px dashed #edcbd6', padding: '1rem 0', margin: '1rem 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {selectedReceipt.items.map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem' }}>
                    <span>
                      {item.quantity}x {item.name}
                    </span>
                    <span style={{ fontWeight: '700' }}>₹{item.price * item.quantity}</span>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid #f7f4ed', marginTop: '0.75rem', paddingTop: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b635c' }}>
                  <span>Subtotal</span>
                  <span>₹{selectedReceipt.subtotal}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#6b635c' }}>
                  <span>GST (5%)</span>
                  <span>₹{selectedReceipt.tax}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem', fontWeight: '800', marginTop: '0.35rem', color: '#3c0921' }}>
                  <span>Grand Total</span>
                  <span style={{ color: '#b32638' }}>₹{selectedReceipt.total}</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: '0.8rem', color: '#6b635c', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              <div>Counter: <strong>{selectedReceipt.pickupCounter}</strong></div>
              <div>Pickup Time: <strong>{selectedReceipt.pickupTime}</strong></div>
              <div>Payment Mode: <strong>{selectedReceipt.paymentMethod}</strong></div>
              <div>Status: <strong>{selectedReceipt.status}</strong></div>
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
    </div>
  );
};
