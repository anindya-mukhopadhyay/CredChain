"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Menu, Search, ShieldCheck, ArrowRight, LogIn, LogOut } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

interface TopNavProps {
  onMenuClick: () => void;
}

export function TopNav({ onMenuClick }: TopNavProps) {
  const [quickVerifyId, setQuickVerifyId] = useState("");
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleQuickVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickVerifyId.trim()) {
      router.push(`/verify/${encodeURIComponent(quickVerifyId.trim())}`);
      setQuickVerifyId("");
    }
  };

  const roleBadgeVariant = (role?: string) => {
    switch (role) {
      case "SUPER_ADMIN":
        return "danger";
      case "ORGANIZATION_ADMIN":
        return "info";
      case "ISSUER":
        return "success";
      case "VERIFIER":
        return "secondary";
      default:
        return "default";
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="md:hidden p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <form onSubmit={handleQuickVerify} className="hidden sm:flex items-center relative w-72 lg:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Quick verify by Credential ID / UUID..."
            value={quickVerifyId}
            onChange={(e) => setQuickVerifyId(e.target.value)}
            className="w-full pl-9 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
          />
          {quickVerifyId && (
            <button type="submit" className="absolute right-2 text-sky-600 hover:text-sky-800">
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </form>
      </div>

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/verify")}
          className="text-xs gap-1.5"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span className="hidden sm:inline">Verification Portal</span>
        </Button>

        {user ? (
          <div className="flex items-center gap-3 pl-2 border-l border-slate-200">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-xs font-bold text-slate-900 leading-tight">{user.displayName}</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={roleBadgeVariant(user.role)} size="sm">
                  {user.role}
                </Badge>
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-2 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Button
            variant="primary"
            size="sm"
            onClick={() => router.push("/login")}
            className="text-xs gap-1.5"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </Button>
        )}
      </div>
    </header>
  );
}
