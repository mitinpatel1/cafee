
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from "react";

import { api } from "../api/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [token, setToken] = useState(
    localStorage.getItem("officebite_token") || null
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const initAuth = async () => {
      if (!token) {
        if (active) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.getProfile();

        if (active && response.success && response.user) {
          setUser(response.user);
        } else if (active) {
          localStorage.removeItem("officebite_token");
          setToken(null);
          setUser(null);
        }
      } catch (error) {
        if (active) {
          localStorage.removeItem("officebite_token");
          setToken(null);
          setUser(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    initAuth();

    return () => {
      active = false;
    };
  }, [token]);

  const login = async (email, password) => {
    const response = await api.login({
      email,
      password,
    });

    if (response.success && response.token) {
      localStorage.setItem(
        "officebite_token",
        response.token
      );

      setToken(response.token);
      setUser(response.user);

      return response.user;
    }

    throw new Error("Login failed.");
  };

  const register = async (data) => {
    const response = await api.register(data);

    if (response.success && response.token) {
      localStorage.setItem(
        "officebite_token",
        response.token
      );

      setToken(response.token);
      setUser(response.user);

      return response.user;
    }

    throw new Error("Registration failed.");
  };

  const logout = () => {
    localStorage.removeItem("officebite_token");
    setToken(null);
    setUser(null);
  };

  const updateProfile = async (data) => {
    const response = await api.updateProfile(data);

    if (response.success && response.user) {
      setUser(response.user);
      return response.user;
    }

    throw new Error("Could not update profile.");
  };

  const uploadProfileAvatar = async (file) => {
    const response = await api.uploadProfileAvatar(file);

    if (response.success && response.user) {
      setUser(response.user);
      return response.user;
    }

    throw new Error("Could not upload profile photo.");
  };

  const removeProfileAvatar = async () => {
    const response = await api.removeProfileAvatar();

    if (response.success && response.user) {
      setUser(response.user);
      return response.user;
    }

    throw new Error("Could not remove profile photo.");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,

        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
        isStaffOrAdmin: user?.role === "admin",

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

export const useAuth = () => useContext(AuthContext);
