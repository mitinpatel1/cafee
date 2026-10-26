import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import { AuthProvider } from "./context/AuthContext";
import { FranchiseSelectionProvider } from "./context/FranchiseSelectionContext";
import { CartProvider } from "./context/CartContext";
import { SocketProvider } from "./context/SocketContext";

import { Navbar } from "./components/layout/Navbar";
import { AdminLayout } from "./components/layout/AdminLayout";
import { FranchiseLayout } from "./components/layout/FranchiseLayout";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { NotificationToast } from "./components/ui/NotificationToast";

import {
  UtensilsCrossed,
  MapPin,
  Clock,
  Phone,
} from "lucide-react";

// User Pages
import { LoginPage } from "./pages/auth/LoginPage";
import { HomePage } from "./pages/customer/HomePage";
import { MenuPage } from "./pages/customer/MenuPage";
import { CartPage } from "./pages/customer/CartPage";
import { CheckoutPage } from "./pages/customer/CheckoutPage";
import { MyOrdersPage } from "./pages/customer/MyOrdersPage";
import { ProfilePage } from "./pages/customer/ProfilePage";
import { OrderTrackingPage } from "./pages/customer/OrderTrackingPage";

// Admin Pages
import { AdminDashboardPage } from "./pages/admin/AdminDashboardPage";
import { AdminMenuPage } from "./pages/admin/AdminMenuPage";
import { AdminOrdersPage } from "./pages/admin/AdminOrdersPage";
import { AdminInventoryPage } from "./pages/admin/AdminInventoryPage";
import { AdminReportsPage } from "./pages/admin/AdminReportsPage";

// Franchise Pages
import { FranchiseDashboardPage } from "./pages/franchise/FranchiseDashboardPage";
import { FranchiseBranchesPage } from "./pages/franchise/FranchiseBranchesPage";
import { FranchiseRegistrationPage } from "./pages/auth/FranchiseRegistrationPage";
import { FranchiseMenuPage } from "./pages/franchise/FranchiseMenuPage";
import { FranchiseOrdersPage } from "./pages/franchise/FranchiseOrdersPage";
import { ServiceFranchisesPage } from "./pages/admin/ServiceFranchisesPage";

// Dark theme routes
const DARK_ROUTES = [];

// Employee / Public Layout
const EmployeeLayout = ({ children }) => {
  const { pathname } = useLocation();
  const dark = DARK_ROUTES.includes(pathname);

  return (
    <div className={`app-container ${dark ? "theme-dark" : ""}`}>
      <Navbar />

      <main className="main-content" style={{ paddingBottom: 0 }}>
        {children}
      </main>

      <NotificationToast />

      <footer className="ob-footer">
        <div className="ob-wrap">
          <div className="ob-logo">
            <span className="ob-logo-mark">
              <UtensilsCrossed size={19} />
            </span>

            <span>office<b>bite.</b></span>
          </div>

          <p>
            Real food from real kitchens. Fresh choices, simple ordering, and easy pickup.
          </p>

          <div className="ob-foot-links">
            <span><MapPin size={14} /> Choose your franchise at checkout</span>
            <span><Clock size={14} /> Pickup details are confirmed with your order</span>
          </div>
          <div className="ob-copy">© {new Date().getFullYear()} OfficeBite · Food orders and pickup</div>
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
          <FranchiseSelectionProvider>
          <SocketProvider>
            <Routes>
              {/* Employee / Public Routes */}

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
                    <ProtectedRoute allowedRoles={["user", "employee"]}>
                      <CheckoutPage />
                    </ProtectedRoute>
                  </EmployeeLayout>
                }
              />

              <Route
                path="/my-orders"
                element={
                  <EmployeeLayout>
                    <ProtectedRoute allowedRoles={["user", "employee"]}>
                      <MyOrdersPage />
                    </ProtectedRoute>
                  </EmployeeLayout>
                }
              />

              <Route
                path="/profile"
                element={
                  <EmployeeLayout>
                    <ProtectedRoute allowedRoles={["user", "employee"]}>
                      <ProfilePage />
                    </ProtectedRoute>
                  </EmployeeLayout>
                }
              />

              <Route
                path="/track/:orderId"
                element={
                  <EmployeeLayout>
                    <ProtectedRoute allowedRoles={["user", "employee"]}>
                      <OrderTrackingPage />
                    </ProtectedRoute>
                  </EmployeeLayout>
                }
              />

              {/* Franchise registration and dedicated private logins */}
              <Route path="/franchise/register" element={<FranchiseRegistrationPage />} />
              <Route path="/franchise/login" element={<LoginPage portal="franchise" />} />
              <Route path="/admin/login" element={<LoginPage portal="admin" />} />

              {/* Service administrator only */}
              <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]} loginPath="/admin/login"><AdminLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<AdminDashboardPage />} />
                <Route path="franchises" element={<ServiceFranchisesPage />} />
                
                <Route path="orders" element={<AdminOrdersPage />} />
                <Route path="inventory" element={<AdminInventoryPage />} />
                <Route path="reports" element={<AdminReportsPage />} />
              </Route>

              {/* Franchise owner: never use admin APIs or see another owner's data */}
              <Route path="/franchise" element={<ProtectedRoute allowedRoles={["franchise"]} loginPath="/franchise/login"><FranchiseLayout /></ProtectedRoute>}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<FranchiseDashboardPage />} />
                <Route path="branches" element={<FranchiseBranchesPage />} />
                <Route path="orders" element={<FranchiseOrdersPage />} />
                <Route path="menu" element={<FranchiseMenuPage />} />
              </Route>

              {/* Fallback Route */}

              <Route
                path="*"
                element={<Navigate to="/" replace />}
              />
            </Routes>
          </SocketProvider>
          </FranchiseSelectionProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}