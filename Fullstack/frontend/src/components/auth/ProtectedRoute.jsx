
import React from "react";
import {
  Navigate,
  useLocation,
  Link,
} from "react-router-dom";

import { useAuth } from "../../context/AuthContext";

import {
  ShieldAlert,
  ArrowLeft,
  RefreshCw,
  WifiOff,
} from "lucide-react";

// ============================================
// PROTECTED ROUTE COMPONENT
// ============================================

export const ProtectedRoute = ({
  children,
  allowedRoles,
  loginPath,
}) => {
  const {
    user,
    loading,
    isAuthenticated,
    authError,
    retryAuth,
  } = useAuth();

  const location = useLocation();

  // ============================================
  // PORTAL-SPECIFIC LOGIN PATH
  // ============================================

  const currentPath = location.pathname;

  const defaultLoginPath =
    currentPath === "/admin" ||
    currentPath.startsWith("/admin/")
      ? "/admin/login"
      : currentPath === "/franchise" ||
          currentPath.startsWith("/franchise/")
        ? "/franchise/login"
        : "/login";

  const redirectPath = loginPath || defaultLoginPath;

  // ============================================
  // LOADING — VERIFY SESSION
  // ============================================

  if (loading) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
        }}
      >
        <div
          style={{
            width: "44px",
            height: "44px",
            border: "4px solid #eee7db",
            borderTopColor: "#b32638",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />

        <style>
          {`
            @keyframes spin {
              to {
                transform: rotate(360deg);
              }
            }
          `}
        </style>

        <h3
          style={{
            fontSize: "1rem",
            fontWeight: "700",
            color: "#3c0921",
          }}
        >
          Verifying Your Session
        </h3>

        <p
          style={{
            color: "#6b635c",
            fontSize: "0.9rem",
            textAlign: "center",
          }}
        >
          Checking your login and permissions...
        </p>
      </div>
    );
  }

  // ============================================
  // AUTH ERROR — DO NOT FORCE LOGOUT
  // ============================================

  if (authError) {
    return (
      <div
        className="max-width-container"
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "3rem 1rem",
        }}
      >
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "460px",
            padding: "2.5rem 2rem",
            borderRadius: "20px",
            boxShadow: "var(--shadow-lg)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: "65px",
              height: "65px",
              borderRadius: "50%",
              background: "#fff3e6",
              color: "#b32638",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <WifiOff size={30} />
          </div>

          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: "800",
              color: "#3c0921",
              marginBottom: "0.75rem",
            }}
          >
            Session Verification Failed
          </h2>

          <p
            role="alert"
            style={{
              color: "#6b635c",
              fontSize: "0.92rem",
              lineHeight: 1.6,
              marginBottom: "1.5rem",
            }}
          >
            {authError}
          </p>

          <button
            type="button"
            className="btn btn-primary"
            onClick={() => retryAuth?.()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
              padding: "0.8rem 1.5rem",
              borderRadius: "10px",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={17} />
            Retry Verification
          </button>

          <p
            style={{
              marginTop: "1.25rem",
              fontSize: "0.82rem",
              color: "#8b827a",
            }}
          >
            Your saved login session has not been
            cleared. Please check your connection
            and try again.
          </p>
        </div>
      </div>
    );
  }

  // ============================================
  // NOT AUTHENTICATED
  // ============================================

  if (!isAuthenticated || !user) {
    return (
      <Navigate
        to={redirectPath}
        state={{
          from: location,
        }}
        replace
      />
    );
  }

  // ============================================
  // ROLE-BASED ACCESS CONTROL
  // ============================================

  if (
    Array.isArray(allowedRoles) &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user.role)
  ) {
    return (
      <div
        className="max-width-container"
        style={{
          padding: "4rem 1rem",
          maxWidth: "560px",
          textAlign: "center",
        }}
      >
        <div
          className="card"
          style={{
            padding: "2.5rem 2rem",
            borderRadius: "20px",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "50%",
              background: "#fee2e2",
              color: "#dc2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}
          >
            <ShieldAlert size={32} />
          </div>

          <h2
            style={{
              fontSize: "1.4rem",
              fontWeight: "800",
              marginBottom: "0.5rem",
              color: "#3c0921",
            }}
          >
            Access Restricted
          </h2>

          <p
            style={{
              color: "#6b635c",
              fontSize: "0.92rem",
              marginBottom: "1.5rem",
              lineHeight: 1.5,
            }}
          >
            This page requires{" "}
            <strong>
              {allowedRoles.join(" or ")}
            </strong>{" "}
            privileges.
            <br />
            Your current role is{" "}
            <span
              style={{
                textTransform: "capitalize",
                fontWeight: "700",
                color: "#b32638",
              }}
            >
              {user.role}
            </span>
            .
          </p>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              flexWrap: "wrap",
              gap: "0.75rem",
            }}
          >
            <Link
              to="/"
              className="btn btn-secondary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <ArrowLeft size={16} />
              Return to Cafeteria
            </Link>

            <Link
              to={redirectPath}
              className="btn btn-primary"
            >
              Switch Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // AUTHORIZED — RENDER DASHBOARD
  // ============================================

  return children;
};

export default ProtectedRoute;
