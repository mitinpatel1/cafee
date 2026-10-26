import React from 'react';
import { Outlet } from 'react-router-dom';
import { FranchiseSidebar } from './FranchiseSidebar';

export const FranchiseLayout = () => {
  return (
    <div className="portal-shell" style={{ display: 'flex', minHeight: '100vh', background: '#fff8f5' }}>
      <FranchiseSidebar />
      <main style={{ flex: 1, padding: 'clamp(1rem, 3vw, 2.25rem)', overflowX: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};
