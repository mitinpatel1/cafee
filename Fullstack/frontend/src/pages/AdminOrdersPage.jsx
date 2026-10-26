import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import { useSocket } from '../context/SocketContext';
import { OrderStatusBadge } from '../components/OrderStatusBadge';
import {
  Clock,
  ChefHat,
  Bell,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  Calendar,
  Filter,
} from 'lucide-react';

export const AdminOrdersPage = () => {
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);

  const { socket } = useSocket();

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await api.getAllOrders({
        status: statusFilter,
        date: dateFilter,
      });
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
  }, [statusFilter, dateFilter]);

  // Real-time kitchen socket event handling
  useEffect(() => {
    if (!socket) return;

    socket.on('new_order', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev]);
    });

    socket.on('order_status_updated', (data) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === data.orderId ? { ...o, status: data.status } : o))
      );
    });

    return () => {
      socket.off('new_order');
      socket.off('order_status_updated');
    };
  }, [socket]);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    try {
      const res = await api.updateOrderStatus(orderId, newStatus);
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch (err) {
      alert(err.message || 'Status transition rejected');
    } finally {
      setUpdatingId(null);
    }
  };

  const getActionControls = (order) => {
    switch (order.status) {
      case 'Pending':
        return (
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              onClick={() => handleUpdateStatus(order._id, 'Preparing')}
              disabled={updatingId === order._id}
              className="btn btn-sm"
              style={{ background: '#ea580c', color: '#ffffff', borderRadius: '8px', fontSize: '0.78rem' }}
            >
              Start Prep 👨‍🍳
            </button>
            <button
              onClick={() => handleUpdateStatus(order._id, 'Cancelled')}
              disabled={updatingId === order._id}
              style={{ background: '#fef2f2', color: '#dc2626', borderRadius: '8px', padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
            >
              Reject
            </button>
          </div>
        );
      case 'Preparing':
        return (
          <button
            onClick={() => handleUpdateStatus(order._id, 'Ready')}
            disabled={updatingId === order._id}
            className="btn btn-sm"
            style={{ background: '#059669', color: '#ffffff', borderRadius: '8px', fontSize: '0.78rem' }}
          >
            Mark Ready 🔔
          </button>
        );
      case 'Ready':
        return (
          <button
            onClick={() => handleUpdateStatus(order._id, 'Completed')}
            disabled={updatingId === order._id}
            className="btn btn-sm"
            style={{ background: '#15803d', color: '#ffffff', borderRadius: '8px', fontSize: '0.78rem' }}
          >
            Mark Completed ✅
          </button>
        );
      default:
        return <span style={{ fontSize: '0.78rem', color: '#9c9288' }}>Archived</span>;
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(query) ||
      o.userId?.name?.toLowerCase().includes(query) ||
      o.items.some((i) => i.name.toLowerCase().includes(query))
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e1915' }}>
            Live Kitchen Order Management
          </h1>
          <p style={{ color: '#6b635c', fontSize: '0.92rem' }}>
            Real-time ticket updates: Pending → Preparing → Ready → Completed.
          </p>
        </div>

        <button
          onClick={fetchOrders}
          className="btn btn-secondary btn-sm"
          style={{ borderRadius: '10px', gap: '0.4rem' }}
        >
          <RefreshCw size={14} /> Refresh Feed
        </button>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '1rem 1.25rem',
          borderRadius: '16px',
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          {/* Status Tabs */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {['All', 'Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: statusFilter === st ? '700' : '500',
                  background: statusFilter === st ? '#2b231d' : '#f7f4ed',
                  color: statusFilter === st ? '#ffffff' : '#2b231d',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                {st}
              </button>
            ))}
          </div>

          {/* Date Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={16} color="#6b635c" />
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid #e0d5c3',
                background: '#fbf9f5',
                fontSize: '0.82rem',
                cursor: 'pointer',
              }}
            >
              <option value="today">Today's Orders</option>
              <option value="all">All Time History</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: '100%' }}>
          <Search size={16} color="#9c9288" style={{ position: 'absolute', left: '12px', top: '12px' }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Order #, employee name, or item..."
            style={{
              width: '100%',
              padding: '0.6rem 1rem 0.6rem 2.4rem',
              borderRadius: '10px',
              border: '1px solid #e0d5c3',
              background: '#fbf9f5',
              outline: 'none',
              fontSize: '0.88rem',
            }}
          />
        </div>
      </div>

      {/* Orders Table */}
      <div
        className="card"
        style={{
          background: '#ffffff',
          borderRadius: '18px',
          border: '1px solid #eee7db',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b635c' }}>
            Loading kitchen tickets...
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', color: '#6b635c' }}>
            No orders found matching the filter.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
              <thead>
                <tr style={{ background: '#fbf9f5', borderBottom: '1px solid #eee7db', color: '#6b635c', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '0.85rem 1.25rem' }}>Order ID</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Employee Details</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Items & Custom Notes</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Pickup Counter / Time</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Amount</th>
                  <th style={{ padding: '0.85rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.85rem 1.25rem', textAlign: 'right' }}>Update Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => (
                  <tr
                    key={order._id}
                    style={{ borderBottom: '1px solid #f7f4ed' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#fbf9f5')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '1rem 1.25rem' }}>
                      <span style={{ fontWeight: '800', color: '#d9532f' }}>#{order.orderNumber}</span>
                      <div style={{ fontSize: '0.72rem', color: '#9c9288' }}>
                        OTP: <strong>{order.pickupOtp || '4021'}</strong>
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <div style={{ fontWeight: '750', color: '#1e1915' }}>
                        {order.userId?.name || 'Employee'}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b635c' }}>
                        {order.userId?.department || 'Tech'} • {order.userId?.employeeId || ''}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <div style={{ maxWidth: '280px' }}>
                        {order.items.map((it, idx) => (
                          <div key={idx} style={{ marginBottom: '2px', fontSize: '0.82rem' }}>
                            <strong>{it.quantity}x</strong> {it.name}
                            {it.instructions && (
                              <div style={{ fontSize: '0.75rem', color: '#ea580c', fontWeight: '600' }}>
                                Note: "{it.instructions}"
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <div style={{ fontWeight: '700', color: '#1e1915' }}>{order.pickupTime}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6b635c' }}>
                        {order.pickupCounter.split('—')[0]}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <div style={{ fontWeight: '800', color: '#1e1915' }}>₹{order.total}</div>
                      <div style={{ fontSize: '0.72rem', color: '#059669', fontWeight: '600' }}>
                        {order.paymentMethod}
                      </div>
                    </td>

                    <td style={{ padding: '1rem 1rem' }}>
                      <OrderStatusBadge status={order.status} />
                    </td>

                    <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                      {getActionControls(order)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
