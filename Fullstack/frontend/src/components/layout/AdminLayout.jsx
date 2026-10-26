import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const AdminLayout = () => {
  return (
    <div className="portal-shell" style={{ display: 'flex', minHeight: '100vh', background: '#fff8f5' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: 'clamp(1rem, 3vw, 2.25rem)', overflowX: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};
