"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import {
  LayoutDashboard,
  Building2,
  Users,
  Award,
  ShieldCheck,
  Activity,
  PlusCircle,
  UserCheck
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, hasRole } = useAuth();

  const isVerifier = user?.role === "VERIFIER";

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: ["ALL"] },
    ...(!isVerifier ? [{ name: "Organizations", href: "/organizations", icon: Building2, roles: ["ALL"] }] : []),
    ...(!isVerifier ? [{ name: "Candidates", href: "/candidates", icon: Users, roles: ["ALL"] }] : []),
    ...(!isVerifier ? [{ name: "Credentials", href: "/credentials", icon: Award, roles: ["ALL"] }] : []),
    ...(hasRole(["SUPER_ADMIN", "ORGANIZATION_ADMIN"])
      ? [{ name: "Users & Roles", href: "/users", icon: UserCheck, roles: ["SUPER_ADMIN", "ORGANIZATION_ADMIN"] }]
      : []),
    { name: "Public Verification", href: "/verify", icon: ShieldCheck, roles: ["ALL"] },
    ...(!isVerifier ? [{ name: "Audit Trail", href: "/audit", icon: Activity, roles: ["ALL"] }] : []),
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 md:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 flex flex-col border-r border-slate-800 transition-transform duration-200 ease-in-out md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Brand Header */}
        <Link href="/" onClick={onClose} className="h-16 flex items-center gap-3 px-6 border-b border-slate-800 bg-slate-950/40 hover:bg-slate-950/60 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-linear-to-br from-sky-400 to-indigo-600 flex items-center justify-center text-white shadow-xs">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-white tracking-tight text-base flex items-center gap-1.5">
              CredChain
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-sky-950 text-sky-400 border border-sky-800">
                v1.0.0
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-medium">Trust every credential.</p>
          </div>
        </Link>

        {/* Quick Action Button */}
        {!isVerifier && (
          <div className="px-4 pt-4 pb-2">
            <Link
              href="/credentials/new"
              onClick={onClose}
              className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-semibold py-2 px-3 rounded-lg shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Issue Marksheet
            </Link>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          {navigation.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors",
                  isActive
                    ? "bg-sky-500/15 text-sky-400 font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                )}
              >
                <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-sky-400" : "text-slate-400")} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Role footer info */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/20 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center justify-between">
            <span>Role Context</span>
            <span className="font-bold text-sky-400 font-mono text-[10px]">{user?.role || "GUEST"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Blockchain Network</span>
            <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Localhost 31337
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
