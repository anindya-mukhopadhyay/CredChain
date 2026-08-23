"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { SafeUser, UserRole } from "@/types";
import { apiClient } from "@/lib/api/client";

interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  hasRole: (roles: UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Rely exclusively on the HttpOnly session cookie
        const profile = await apiClient<SafeUser>("/api/v1/auth/me");
        setUser(profile);
      } catch {
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = async (email: string, password = "CredChain2026!") => {
    const res = await apiClient<{ token: string; user: SafeUser }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });

    // Token is stored in HttpOnly cookie by server; we keep user profile in React memory state
    setUser(res.user);
  };

  const logout = async () => {
    try {
      await apiClient("/api/v1/auth/logout", { method: "POST" });
    } catch {
      // Ignore
    }
    setUser(null);
  };

  const hasRole = (roles: UserRole[]) => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
