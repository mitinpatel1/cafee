
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { useLocation } from "react-router-dom";
import { api } from "../api/api";

const AuthContext = createContext(null);

// Separate login tokens for each portal
const TOKEN_KEYS = {
  admin: "officebite_token_admin",
  franchise: "officebite_token_franchise",
  user: "officebite_token_user",
};

const getPortal = (pathname) => {
  if (
    pathname === "/admin" ||
    pathname.startsWith("/admin/")
  ) {
    return "admin";
  }

  if (
    pathname === "/franchise" ||
    pathname.startsWith("/franchise/")
  ) {
    return "franchise";
  }

  return "user";
};

const validRole = (portal, role) => {
  return portal === "user"
    ? role === "user" || role === "employee"
    : role === portal;
};

export const AuthProvider = ({ children }) => {
  const { pathname } = useLocation();

  const portal = getPortal(pathname);
  const storageKey = TOKEN_KEYS[portal];

  const [revision, setRevision] = useState(0);

  const [session, setSession] = useState(() => {
    const initialPortal = getPortal(
      window.location.pathname
    );

    return {
      portal: initialPortal,
      token: localStorage.getItem(
        TOKEN_KEYS[initialPortal]
      ),
      user: null,
      loading: true,
      authError: null,
    };
  });

  // ============================================
  // RESTORE LOGIN AFTER REFRESH
  // ============================================

  useEffect(() => {
    let active = true;

    const storedToken =
      localStorage.getItem(storageKey);

    setSession({
      portal,
      token: storedToken,
      user: null,
      loading: Boolean(storedToken),
      authError: null,
    });

    if (!storedToken) {
      return () => {
        active = false;
      };
    }

    const restoreSession = async () => {
      try {
        const response = await api.getProfile(
          storedToken
        );

        if (
          !active ||
          localStorage.getItem(storageKey) !== storedToken
        ) {
          return;
        }

        if (
          response.success &&
          response.user &&
          validRole(portal, response.user.role)
        ) {
          setSession({
            portal,
            token: storedToken,
            user: response.user,
            loading: false,
            authError: null,
          });
        } else {
          localStorage.removeItem(storageKey);

          setSession({
            portal,
            token: null,
            user: null,
            loading: false,
            authError: null,
          });
        }
      } catch (error) {
        if (
          !active ||
          localStorage.getItem(storageKey) !== storedToken
        ) {
          return;
        }

        if (
          error.status === 401 ||
          error.status === 403
        ) {
          localStorage.removeItem(storageKey);

          setSession({
            portal,
            token: null,
            user: null,
            loading: false,
            authError: null,
          });
        } else {
          // Do not delete token on temporary server errors.
          setSession({
            portal,
            token: storedToken,
            user: null,
            loading: false,
            authError:
              "Session could not be verified. Check backend connection and retry.",
          });
        }
      }
    };

    restoreSession();

    return () => {
      active = false;
    };
  }, [portal, storageKey, revision]);

  // ============================================
  // SYNC LOGIN / LOGOUT BETWEEN TABS
  // ============================================

  useEffect(() => {
    const onStorage = (event) => {
      if (
        event.key === storageKey ||
        event.key === null
      ) {
        setRevision((value) => value + 1);
      }
    };

    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(
        "storage",
        onStorage
      );
    };
  }, [storageKey]);

  // ============================================
  // LOGIN
  // ============================================

  const login = async (email, password) => {
    const response = await api.login({
      email,
      password,
    });

    if (
      !response.success ||
      !response.token ||
      !response.user
    ) {
      throw new Error("Login failed.");
    }

    if (!validRole(portal, response.user.role)) {
      throw new Error(
        `This login is for ${portal} accounts only.`
      );
    }

    localStorage.setItem(
      storageKey,
      response.token
    );

    setSession({
      portal,
      token: response.token,
      user: response.user,
      loading: false,
      authError: null,
    });

    return response.user;
  };

  // ============================================
  // CUSTOMER REGISTRATION
  // ============================================

  const register = async (data) => {
    if (portal !== "user") {
      throw new Error(
        "Customer registration is only available on the customer portal."
      );
    }

    const response = await api.register(data);

    if (
      !response.success ||
      !response.token ||
      !response.user
    ) {
      throw new Error("Registration failed.");
    }

    if (
      !validRole("user", response.user.role)
    ) {
      throw new Error(
        "Invalid customer account role."
      );
    }

    localStorage.setItem(
      TOKEN_KEYS.user,
      response.token
    );

    setSession({
      portal: "user",
      token: response.token,
      user: response.user,
      loading: false,
      authError: null,
    });

    return response.user;
  };

  // ============================================
  // LOGOUT CURRENT PORTAL ONLY
  // ============================================

  const logout = () => {
    localStorage.removeItem(storageKey);

    setSession({
      portal,
      token: null,
      user: null,
      loading: false,
      authError: null,
    });
  };

  // ============================================
  // UPDATE PROFILE
  // ============================================

  const updateProfile = async (data) => {
    const response = await api.updateProfile(data);

    if (!response.success || !response.user) {
      throw new Error(
        "Could not update profile."
      );
    }

    setSession((previous) =>
      previous.portal === portal
        ? { ...previous, user: response.user }
        : previous
    );

    return response.user;
  };

  // ============================================
  // UPLOAD PROFILE AVATAR
  // ============================================

  const uploadProfileAvatar = async (file) => {
    const response =
      await api.uploadProfileAvatar(file);

    if (!response.success || !response.user) {
      throw new Error(
        "Could not upload profile photo."
      );
    }

    setSession((previous) =>
      previous.portal === portal
        ? { ...previous, user: response.user }
        : previous
    );

    return response.user;
  };

  // ============================================
  // REMOVE PROFILE AVATAR
  // ============================================

  const removeProfileAvatar = async () => {
    const response =
      await api.removeProfileAvatar();

    if (!response.success || !response.user) {
      throw new Error(
        "Could not remove profile photo."
      );
    }

    setSession((previous) =>
      previous.portal === portal
        ? { ...previous, user: response.user }
        : previous
    );

    return response.user;
  };

  // Avoid showing a previous portal's user
  // while switching between dashboards.
  const active =
    session.portal === portal
      ? session
      : {
          user: null,
          token: null,
          loading: true,
          authError: null,
        };

  return (
    <AuthContext.Provider
      value={{
        user: active.user,
        token: active.token,
        loading: active.loading,
        authError: active.authError,

        retryAuth: () =>
          setRevision((value) => value + 1),

        isAuthenticated: Boolean(active.user),
        isAdmin: active.user?.role === "admin",
        isStaffOrAdmin:
          active.user?.role === "admin",

        login,
        register,
        logout,
        updateProfile,
        uploadProfileAvatar,
        removeProfileAvatar,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () =>
  useContext(AuthContext);
