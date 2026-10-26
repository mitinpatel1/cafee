import React, { useState, useEffect } from 'react';
import { api } from '../api/api';
import {
  BarChart3,
  TrendingUp,
  Award,
  PieChart,
  IndianRupee,
  ShoppingBag,
  RefreshCw,
  Download,
} from 'lucide-react';

export const AdminReportsPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    try {
      const res = await api.getReports();
      if (res.success) {
        setData(res);
      }
    } catch (err) {
      console.error('Failed to load reports:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: '#6b635c' }}>
        Loading cafeteria analytics & revenue charts...
      </div>
    );
  }

  const { stats, past7DaysTrend, popularItems, categoryRevenue } = data || {};

  // Find max revenue in 7 days for relative chart height
  const maxDayRevenue = Math.max(...(past7DaysTrend?.map((d) => d.revenue) || [100]), 100);

  // Total Category revenue sum for % calculation
  const totalCatRevenue = Object.values(categoryRevenue || {}).reduce((a, b) => a + b, 0) || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#1e1915' }}>
            Cafeteria Analytics & Sales Reports
          </h1>
          <p style={{ color: '#6b635c', fontSize: '0.92rem' }}>
            Daily/weekly revenue trends, bestselling dishes, and station category breakdown.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={fetchReports}
            className="btn btn-secondary btn-sm"
            style={{ borderRadius: '10px', gap: '0.4rem' }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => window.print()}
            className="btn btn-primary btn-sm"
            style={{ borderRadius: '10px', gap: '0.4rem' }}
          >
            <Download size={14} /> Export Report
          </button>
        </div>
      </div>

      {/* KPI Overview */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))',
          gap: '1.25rem',
        }}
      >
        <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b635c', textTransform: 'uppercase', fontWeight: '700' }}>
            TODAY'S TURNOVER
          </span>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: '800', color: '#059669', marginTop: '0.2rem' }}>
            ₹{stats?.todayRevenue || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b635c', marginTop: '0.25rem' }}>
            {stats?.todayOrders || 0} meals served today
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b635c', textTransform: 'uppercase', fontWeight: '700' }}>
            LIFETIME CAFETERIA REVENUE
          </span>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: '800', color: '#d9532f', marginTop: '0.2rem' }}>
            ₹{stats?.totalLifetimeRevenue || 0}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b635c', marginTop: '0.25rem' }}>
            Corporate subsidized sales
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b635c', textTransform: 'uppercase', fontWeight: '700' }}>
            MENU UTILIZATION
          </span>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: '800', color: '#2563eb', marginTop: '0.2rem' }}>
            {stats?.availableItems} / {stats?.totalItems}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b635c', marginTop: '0.25rem' }}>
            Active dishes available on menu
          </div>
        </div>

        <div className="card" style={{ padding: '1.25rem', borderRadius: '16px', background: '#ffffff' }}>
          <span style={{ fontSize: '0.8rem', color: '#6b635c', textTransform: 'uppercase', fontWeight: '700' }}>
            AVERAGE TICKET SIZE
          </span>
          <div style={{ fontFamily: 'var(--font-heading)', fontSize: '1.85rem', fontWeight: '800', color: '#ea580c', marginTop: '0.2rem' }}>
            ₹{stats?.todayOrders > 0 ? Math.round(stats.todayRevenue / stats.todayOrders) : 165}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b635c', marginTop: '0.25rem' }}>
            Average meal expenditure
          </div>
        </div>
      </div>

      {/* Main Grid: Revenue Bar Chart & Popular Food Items */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '2rem',
          alignItems: 'start',
        }}
      >
        {/* Past 7 Days Revenue Trend Bar Chart */}
        <div
          className="card"
          style={{
            padding: '1.75rem',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid #eee7db',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <TrendingUp size={20} color="#d9532f" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e1915' }}>
              Past 7 Days Revenue Trend
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#6b635c', marginBottom: '2rem' }}>
            Daily revenue in ₹ across cafeteria meal counters
          </p>

          {/* Bar Chart Container */}
          <div
            style={{
              height: '240px',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              gap: '0.85rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid #eee7db',
            }}
          >
            {past7DaysTrend?.map((day) => {
              const heightPercent = Math.max(15, Math.round((day.revenue / maxDayRevenue) * 100));
              return (
                <div
                  key={day.date}
                  style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '0.5rem',
                    height: '100%',
                    justifyContent: 'flex-end',
                  }}
                >
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#1e1915' }}>
                    {day.revenue > 0 ? `₹${day.revenue}` : '₹0'}
                  </div>

                  <div
                    style={{
                      width: '100%',
                      maxWidth: '42px',
                      height: `${heightPercent}%`,
                      background: 'linear-gradient(180deg, #d9532f 0%, #fbd9cf 100%)',
                      borderRadius: '8px 8px 3px 3px',
                      transition: 'height 0.4s ease',
                    }}
                    title={`${day.date}: ₹${day.revenue} (${day.orders} orders)`}
                  />

                  <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#6b635c' }}>
                    {day.dayName}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '0.75rem', color: '#9c9288' }}>
            <span>Weekly Cycle Trend</span>
            <span>Peak hour: 12:30 PM - 2:00 PM Lunch</span>
          </div>
        </div>

        {/* Popular Food Items Leaderboard */}
        <div
          className="card"
          style={{
            padding: '1.75rem',
            borderRadius: '20px',
            background: '#ffffff',
            border: '1px solid #eee7db',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <Award size={20} color="#e59838" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e1915' }}>
              Top Popular Dishes
            </h3>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#6b635c', marginBottom: '1.5rem' }}>
            Bestselling food items ranked by volume & cafeteria sales
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {popularItems?.map((item, idx) => (
              <div
                key={item.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.85rem 1rem',
                  borderRadius: '12px',
                  background: '#fbf9f5',
                  border: '1px solid #eee7db',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: idx === 0 ? '#fef3c7' : '#f7f4ed',
                      color: idx === 0 ? '#b45309' : '#6b635c',
                      fontWeight: '800',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    #{idx + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: '750', fontSize: '0.92rem', color: '#1e1915' }}>
                      {item.name}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#6b635c' }}>
                      {item.count} portions sold
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '800', fontSize: '0.95rem', color: '#059669' }}>
                    ₹{item.revenue}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#9c9288' }}>Total Revenue</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Revenue Distribution Section */}
      <div
        className="card"
        style={{
          padding: '1.75rem',
          borderRadius: '20px',
          background: '#ffffff',
          border: '1px solid #eee7db',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <PieChart size={20} color="#2563eb" />
          <h3 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1e1915' }}>
            Station Revenue Breakdown
          </h3>
        </div>
        <p style={{ fontSize: '0.82rem', color: '#6b635c', marginBottom: '1.5rem' }}>
          Proportional sales across Meals, Snacks, Coffee/Drinks, and Healthy salad counters.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {Object.entries(categoryRevenue || {}).map(([cat, rev]) => {
            const pct = Math.round((rev / totalCatRevenue) * 100);
            return (
              <div
                key={cat}
                style={{
                  padding: '1.25rem',
                  borderRadius: '14px',
                  background: '#fbf9f5',
                  border: '1px solid #eee7db',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: '750', fontSize: '0.95rem', color: '#1e1915' }}>
                    {cat}
                  </span>
                  <span style={{ fontWeight: '800', color: '#d9532f' }}>{pct}%</span>
                </div>

                <div
                  style={{
                    height: '8px',
                    width: '100%',
                    background: '#eee7db',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    marginBottom: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: '#d9532f',
                      borderRadius: '9999px',
                    }}
                  />
                </div>

                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#059669' }}>
                  ₹{rev} Total Sales
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
