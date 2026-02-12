"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { loginWithProvider, getSessionUser } from "@/lib/api";
import { OAuthProvider, SessionUser } from "@/lib/types";

interface AuthContextValue {
  user: SessionUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (provider: OAuthProvider) => SessionUser;
  logout: () => void;
}

const SESSION_STORAGE_KEY = "seizuki:user-id";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }
    const storedUserId = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!storedUserId) {
      return null;
    }
    const sessionUser = getSessionUser(storedUserId);
    if (!sessionUser) {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      return null;
    }
    return sessionUser;
  });

  const login = useCallback((provider: OAuthProvider) => {
    const nextUser = loginWithProvider(provider);
    window.localStorage.setItem(SESSION_STORAGE_KEY, nextUser._id);
    setUser(nextUser);
    return nextUser;
  }, []);

  const logout = useCallback(() => {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loading: false,
      login,
      logout,
    }),
    [login, logout, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }
  return context;
};
