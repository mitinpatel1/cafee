import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/api';
import { useSocket } from '../../context/SocketContext';
import { StatCard } from '../../components/ui/StatCard';
import { OrderStatusBadge } from '../../components/ui/OrderStatusBadge';
import {
  ShoppingBag,
  IndianRupee,
  Clock,
  UtensilsCrossed,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChefHat,
  Bell,
  RefreshCw,
} from 'lucide-react';

export const AdminDashboardPage = () => {
  const [reports, setReports] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const { socket } = useSocket();

  const fetchDashboardData = async () => {
    try {
      const [reportsRes, ordersRes] = await Promise.all([
        api.getReports(),
        api.getAllOrders({ limit: 8 }),
      ]);

      if (reportsRes.success) {
        setReports(reportsRes);
      }
      if (ordersRes.success) {
        setRecentOrders(ordersRes.orders);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Real-time updates when orders are placed or updated
  useEffect(() => {
    if (!socket) return;

    socket.on('new_order', (newOrder) => {
      setRecentOrders((prev) => [newOrder, ...prev.slice(0, 7)]);
      fetchDashboardData();
    });

    socket.on('order_status_updated', () => {
      fetchDashboardData();
    });

    return () => {
      socket.off('new_order');
      socket.off('order_status_updated');
    };
  }, [socket]);

  const handleAdvanceStatus = async (orderId, nextStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await api.updateOrderStatus(orderId, nextStatus);
      if (res.success) {
        setRecentOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status: nextStatus } : o))
        );
      }
    } catch (err) {
      alert(err.message || 'Status transition failed');
    } finally {
      setUpdatingId(null);
    }
  };

  const getNextAction = (status) => {
    if (status === 'Pending') return { next: 'Preparing', label: 'Start Prep 👨‍🍳', bg: '#ea580c' };
    if (status === 'Preparing') return { next: 'Ready', label: 'Ready for Pickup 🔔', bg: '#059669' };
    if (status === 'Ready') return { next: 'Completed', label: 'Mark Handed Over ✅', bg: '#15803d' };
    return null;
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b635c' }}>
        Loading Cafeteria Operations Dashboard...
      </div>
    );
  }

  const stats = reports?.stats || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: '700',
                color: '#059669',
                background: '#ecfdf5',
                padding: '0.2rem 0.6rem',
                borderRadius: '6px',
              }}
            >
              ● OPERATIONS LIVE
            </span>
          </div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#3c0921' }}>
            Cafeteria Operations Dashboard
          </h1>
          <p style={{ color: '#6b635c', fontSize: '0.92rem' }}>
            Live metrics, incoming kitchen orders, inventory alerts & revenue.
          </p>
        </div>

        <button
          onClick={fetchDashboardData}
          className="btn btn-secondary btn-sm"
          style={{ borderRadius: '10px', gap: '0.4rem' }}
        >
          <RefreshCw size={14} /> Refresh Data
        </button>
      </div>

      {/* Low-stock Warning Alert Banner if any */}
      {stats.lowStockCount > 0 && (
        <div
          style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            color: '#92400e',
            borderRadius: '14px',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={22} color="#d97706" />
            <div>
              <span style={{ fontWeight: '800', fontSize: '0.95rem' }}>
                Inventory Alert: {stats.lowStockCount} ingredient(s) are below reorder level!
              </span>
              <div style={{ fontSize: '0.82rem', color: '#b45309' }}>
                Coffee beans, bread or dairy stock running low in pantry.
              </div>
            </div>
          </div>

          <Link
            to="/admin/inventory"
            className="btn btn-sm"
            style={{
              background: '#d97706',
              color: '#ffffff',
              borderRadius: '8px',
              fontWeight: '700',
            }}
          >
            Manage Inventory & Restock →
          </Link>
        </div>
      )}

      {/* Stat Cards Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <StatCard
          title="Today's Orders"
          value={stats.todayOrders || 0}
          icon={ShoppingBag}
          subtitle="Orders placed today"
          trend="+14% vs yesterday"
          color="#b32638"
        />

        <StatCard
          title="Today's Revenue"
          value={`₹${stats.todayRevenue || 0}`}
          icon={IndianRupee}
          subtitle="Total sales today"
          trend="+8% volume"
          color="#059669"
        />

        <StatCard
          title="Pending Kitchen Orders"
          value={stats.pendingOrders || 0}
          icon={Clock}
          subtitle="Awaiting prep / ready"
          color="#ea580c"
        />

        <StatCard
          title="Available Menu Items"
          value={`${stats.availableItems || 0} / ${stats.totalItems || 0}`}
          icon={UtensilsCrossed}
          subtitle="Live cafeteria dishes"
          color="#2563eb"
        />
      </div>

      {/* Live Orders Table */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #eee7db',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid #f7f4ed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#3c0921' }}>
              Live Cafeteria Orders Feed
            </h3>
            <p style={{ fontSize: '0.82rem', color: '#6b635c' }}>
              Real-time feed with 1-click status advancement controls.
            </p>
          </div>

          <Link
            to="/admin/orders"
            style={{
              fontSize: '0.85rem',
              fontWeight: '700',
              color: '#b32638',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
            }}
          >
            View All Orders Board <ArrowRight size={15} />
          </Link>
        </div>

        {/* Orders Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
            <thead>
              <tr style={{ background: '#fbf9f5', borderBottom: '1px solid #eee7db', color: '#6b635c', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.85rem 1.25rem' }}>Order ID</th>
                <th style={{ padding: '0.85rem 1rem' }}>Employee</th>
                <th style={{ padding: '0.85rem 1rem' }}>Items Ordered</th>
                <th style={{ padding: '0.85rem 1rem' }}>Pickup Time</th>
                <th style={{ padding: '0.85rem 1rem' }}>Total</th>
                <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => {
                const action = getNextAction(order.status);
                return (
                  <tr
                    key={order._id}
                    style={{
                      borderBottom: '1px solid #f7f4ed',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fbf9f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.25rem', fontWeight: '800', color: '#b32638' }}>
                      #{order.orderNumber}
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <div style={{ fontWeight: '700', color: '#3c0921' }}>
                        {order.userId?.name || 'Employee'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b635c' }}>
                        {order.userId?.department || 'Staff'} • {order.userId?.employeeId || ''}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <div style={{ maxWidth: '240px' }}>
                        {order.items.map((i, idx) => (
                          <div key={idx} style={{ fontSize: '0.82rem', color: '#581832' }}>
                            <strong>{i.quantity}x</strong> {i.name}
                            {i.instructions && (
                              <span style={{ fontSize: '0.75rem', color: '#b32638', marginLeft: '4px' }}>
                                ({i.instructions})
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem', color: '#581832' }}>
                      <div style={{ fontWeight: '600' }}>{order.pickupTime}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b635c' }}>
                        {order.pickupCounter.split('—')[0]}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem', fontWeight: '800', color: '#3c0921' }}>
                      ₹{order.total}
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <OrderStatusBadge status={order.status} />
                    </td>

                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      {action ? (
                        <button
                          onClick={() => handleAdvanceStatus(order._id, action.next)}
                          disabled={updatingId === order._id}
                          style={{
                            background: action.bg,
                            color: '#ffffff',
                            padding: '0.45rem 0.85rem',
                            borderRadius: '8px',
                            fontSize: '0.8rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                          }}
                        >
                          {updatingId === order._id ? 'Updating...' : action.label}
                        </button>
                      ) : (
                        <span style={{ fontSize: '0.78rem', color: '#9c9288' }}>No action</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
