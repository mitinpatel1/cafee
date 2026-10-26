import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';

import { Navbar } from './components/Navbar';
import { AdminLayout } from './components/AdminLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { UtensilsCrossed, MapPin, Clock, Phone } from 'lucide-react';
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
        <div className="ob-wrap">
          <div className="ob-logo"><span className="ob-logo-mark"><UtensilsCrossed size={19} /></span><span>Office<b>Bite</b></span></div>
          <p>Fresh cafeteria food with scheduled pickup, so your lunch break is for eating and not for standing in line.</p>
          <div className="ob-foot-links">
            <span><MapPin size={14} /> Ground floor, Cafeteria</span>
            <span><Clock size={14} /> Mon – Fri, 8:00 – 18:00</span>
            <span><Phone size={14} /> Ext. 1020</span>
          </div>
          <div className="ob-copy">© {new Date().getFullYear()} OfficeBite. Counter 1: Meals · Counter 2: Snacks · Counter 3: Tea &amp; Coffee</div>
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
