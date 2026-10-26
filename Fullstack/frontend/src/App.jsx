import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';

import { Navbar } from './components/Navbar';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotificationToast } from './components/NotificationToast';

import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { MenuPage } from './pages/MenuPage';
import { CartPage } from './pages/CartPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { MyOrdersPage } from './pages/MyOrdersPage';
import { ProfilePage } from './pages/ProfilePage';

import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminMenuPage } from './pages/AdminMenuPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';
import { AdminInventoryPage } from './pages/AdminInventoryPage';
import { AdminReportsPage } from './pages/AdminReportsPage';

// Layout wrapper for Employee / Public pages. Home + Menu use the dark theme.
const DARK_ROUTES = ['/', '/menu'];

const EmployeeLayout = ({ children }) => {
  const { pathname } = useLocation();
  const dark = DARK_ROUTES.includes(pathname);
  return (
    <div className={`app-container ${dark ? 'theme-dark' : ''}`}>
      <Navbar />
      <main className="main-content" style={{ paddingBottom: 0 }}>{children}</main>
      <NotificationToast />

      <footer className="ob-footer">
        <div className="ob-wrap ob-footer-in">
          <div>
            <div className="ob-logo"><span>Office<b>Bite</b></span></div>
            <div style={{ marginTop: '.3rem' }}>Fresh cafeteria food with scheduled pickup.</div>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <span>Counter 1: Meals</span>
            <span>Counter 2: Snacks</span>
            <span>Counter 3: Tea &amp; Coffee</span>
          </div>
          <div style={{ fontSize: '.78rem' }}>© {new Date().getFullYear()} OfficeBite</div>
        </div>
      </footer>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <SocketProvider>
            <Routes>
              {/* Employee & Public Routes */}
              <Route
                path="/"
                element={
                  <EmployeeLayout>
                    <HomePage />
                  </EmployeeLayout>
                }
              />
              <Route
                path="/login"
                element={
                  <EmployeeLayout>
                    <LoginPage />
                  </EmployeeLayout>
                }
              />
              <Route
                path="/menu"
                element={
                  <EmployeeLayout>
                    <MenuPage />
                  </EmployeeLayout>
                }
              />
              <Route
                path="/cart"
                element={
                  <EmployeeLayout>
                    <CartPage />
                  </EmployeeLayout>
                }
              />
              <Route
                path="/checkout"
                element={
                  <EmployeeLayout>
                    <ProtectedRoute>
                      <CheckoutPage />
                    </ProtectedRoute>
                  </EmployeeLayout>
                }
              />
              <Route
                path="/my-orders"
                element={
                  <EmployeeLayout>
                    <ProtectedRoute>
                      <MyOrdersPage />
                    </ProtectedRoute>
                  </EmployeeLayout>
                }
              />
              <Route
                path="/profile"
                element={
                  <EmployeeLayout>
                    <ProtectedRoute>
                      <ProfilePage />
                    </ProtectedRoute>
                  </EmployeeLayout>
                }
              />

              {/* Admin / Kitchen Staff Protected Routes */}
              <Route
                path="/admin"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'staff']}>
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<AdminDashboardPage />} />
                <Route path="menu" element={<AdminMenuPage />} />
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="inventory" element={<AdminInventoryPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </SocketProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
