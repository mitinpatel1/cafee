
import React from "react";

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// ============================================
// CONTEXT PROVIDERS
// ============================================

import { AuthProvider } from "./context/AuthContext";

import { CartProvider } from "./context/CartContext";

import { FranchiseSelectionProvider } from "./context/FranchiseSelectionContext";

import { SocketProvider } from "./context/SocketContext";

// ============================================
// LAYOUT COMPONENTS
// ============================================

import { AdminLayout } from "./components/layout/AdminLayout";

import { FranchiseLayout } from "./components/layout/FranchiseLayout";

import { ProtectedRoute } from "./components/auth/ProtectedRoute";

// ============================================
// SELF-SERVICE KIOSK
// ============================================

import { KioskPage } from "./pages/kiosk/KioskPage";

// ============================================
// AUTHENTICATION PAGES
// ============================================

import { LoginPage } from "./pages/auth/LoginPage";

import { FranchiseRegistrationPage } from "./pages/auth/FranchiseRegistrationPage";

// ============================================
// ADMIN DASHBOARD PAGES
// ============================================


import AdminDashboardPage from "./pages/admin/AdminDashboardPage";


import { AdminMenuPage } from "./pages/admin/AdminMenuPage";

import { AdminOrdersPage } from "./pages/admin/AdminOrdersPage";

import { AdminInventoryPage } from "./pages/admin/AdminInventoryPage";

import { AdminReportsPage } from "./pages/admin/AdminReportsPage";

import { ServiceFranchisesPage } from "./pages/admin/ServiceFranchisesPage";

// ============================================
// FRANCHISE DASHBOARD PAGES
// ============================================

import { FranchiseDashboardPage } from "./pages/franchise/FranchiseDashboardPage";

import { FranchiseBranchesPage } from "./pages/franchise/FranchiseBranchesPage";

import { FranchiseMenuPage } from "./pages/franchise/FranchiseMenuPage";

import { FranchiseOrdersPage } from "./pages/franchise/FranchiseOrdersPage";

import { FranchiseInventoryPage } from "./pages/franchise/FranchiseInventoryPage";

import { FranchiseReportsPage } from "./pages/franchise/FranchiseReportsPage";

import { FranchiseSettingsPage } from "./pages/franchise/FranchiseSettingsPage";

// ============================================
// MAIN APP COMPONENT
// ============================================

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <FranchiseSelectionProvider>
            <SocketProvider>
              <Routes>

                {/* ====================================
                    PUBLIC SELF-SERVICE KIOSK
                    NO CUSTOMER LOGIN REQUIRED
                ==================================== */}

                <Route
                  path="/"
                  element={<KioskPage />}
                />

                <Route
                  path="/kiosk"
                  element={<KioskPage />}
                />

                {/* ====================================
                    OLD CUSTOMER ROUTES
                    REDIRECT TO PUBLIC KIOSK
                ==================================== */}

                <Route
                  path="/discover"
                  element={
                    <Navigate
                      to="/kiosk"
                      replace
                    />
                  }
                />

                <Route
                  path="/login"
                  element={
                    <Navigate
                      to="/kiosk"
                      replace
                    />
                  }
                />

                <Route
                  path="/menu"
                  element={
                    <Navigate
                      to="/kiosk"
                      replace
                    />
                  }
                />

                <Route
                  path="/cart"
                  element={
                    <Navigate
                      to="/kiosk"
                      replace
                    />
                  }
                />

                <Route
                  path="/checkout"
                  element={
                    <Navigate
                      to="/kiosk"
                      replace
                    />
                  }
                />

                <Route
                  path="/my-orders"
                  element={
                    <Navigate
                      to="/kiosk"
                      replace
                    />
                  }
                />

                <Route
                  path="/order-history"
                  element={
                    <Navigate
                      to="/kiosk"
                      replace
                    />
                  }
                />

                <Route
                  path="/profile"
                  element={
                    <Navigate
                      to="/kiosk"
                      replace
                    />
                  }
                />

                <Route
                  path="/track/:orderId"
                  element={
                    <Navigate
                      to="/kiosk"
                      replace
                    />
                  }
                />

                {/* ====================================
                    ADMIN AUTHENTICATION
                ==================================== */}

                <Route
                  path="/admin/login"
                  element={
                    <LoginPage portal="admin" />
                  }
                />

                {/* ====================================
                    FRANCHISE AUTHENTICATION
                ==================================== */}

                <Route
                  path="/franchise/login"
                  element={
                    <LoginPage portal="franchise" />
                  }
                />

                <Route
                  path="/franchise/register"
                  element={
                    <FranchiseRegistrationPage />
                  }
                />

                {/* ====================================
                    ADMIN PROTECTED DASHBOARD
                ==================================== */}

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute
                      allowedRoles={["admin"]}
                      loginPath="/admin/login"
                    >
                      <AdminLayout />
                    </ProtectedRoute>
                  }
                >

                  <Route
                    index
                    element={
                      <Navigate
                        to="dashboard"
                        replace
                      />
                    }
                  />

                  <Route
                    path="dashboard"
                    element={
                      <AdminDashboardPage />
                    }
                  />

                  <Route
                    path="orders"
                    element={
                      <AdminOrdersPage />
                    }
                  />

                  <Route
                    path="menu"
                    element={
                      <AdminMenuPage />
                    }
                  />

                  <Route
                    path="franchises"
                    element={
                      <ServiceFranchisesPage />
                    }
                  />

                  <Route
                    path="inventory"
                    element={
                      <AdminInventoryPage />
                    }
                  />

                  <Route
                    path="reports"
                    element={
                      <AdminReportsPage />
                    }
                  />

                </Route>

                {/* ====================================
                    FRANCHISE PROTECTED DASHBOARD
                ==================================== */}

                <Route
                  path="/franchise"
                  element={
                    <ProtectedRoute
                      allowedRoles={["franchise"]}
                      loginPath="/franchise/login"
                    >
                      <FranchiseLayout />
                    </ProtectedRoute>
                  }
                >

                  <Route
                    index
                    element={
                      <Navigate
                        to="dashboard"
                        replace
                      />
                    }
                  />

                  <Route
                    path="dashboard"
                    element={
                      <FranchiseDashboardPage />
                    }
                  />

                  <Route
                    path="branches"
                    element={
                      <FranchiseBranchesPage />
                    }
                  />

                  <Route
                    path="orders"
                    element={
                      <FranchiseOrdersPage />
                    }
                  />

                  <Route
                    path="menu"
                    element={
                      <FranchiseMenuPage />
                    }
                  />

                  <Route
                    path="inventory"
                    element={
                      <FranchiseInventoryPage />
                    }
                  />

                  <Route
                    path="reports"
                    element={
                      <FranchiseReportsPage />
                    }
                  />

                  <Route
                    path="settings"
                    element={
                      <FranchiseSettingsPage />
                    }
                  />

                </Route>

                {/* ====================================
                    FALLBACK ROUTE
                ==================================== */}

                <Route
                  path="*"
                  element={
                    <Navigate
                      to="/kiosk"
                      replace
                    />
                  }
                />

              </Routes>
            </SocketProvider>
          </FranchiseSelectionProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
