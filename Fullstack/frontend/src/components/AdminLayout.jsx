import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';

export const AdminLayout = () => {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#fbf9f5' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '2rem', overflowX: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};
