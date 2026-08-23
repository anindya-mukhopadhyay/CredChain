"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  getDashboardStats,
  listCredentials,
  listAuditLogs,
} from "@/lib/api";
import type { DashboardStats, Credential, AuditLog } from "@/types";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/Card";
import { StatusBadge } from "@/components/credentials/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate, formatDateTime, truncateHash } from "@/lib/utils";
import {
  Users,
  Award,
  ShieldCheck,
  AlertCircle,
  Clock,
  ArrowUpRight,
  PlusCircle,
  Activity,
  Building2,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentCredentials, setRecentCredentials] = useState<Credential[]>([]);
  const [recentAudits, setRecentAudits] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [statsData, credsData, auditData] = await Promise.all([
        getDashboardStats(),
        listCredentials(),
        listAuditLogs(),
      ]);
      setStats(statsData);
      setRecentCredentials(credsData.slice(0, 5));
      setRecentAudits(auditData.slice(0, 5));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load dashboard metrics";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Spinner size="lg" className="text-sky-600" />
        <p className="text-sm font-medium">Loading organization dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <AlertCircle className="w-5 h-5 text-rose-600" />
          <span>Dashboard Connection Error</span>
        </div>
        <p className="text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={loadData}>
          Retry
        </Button>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Candidates",
      value: stats?.totalCandidates ?? 0,
      icon: Users,
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      href: "/candidates",
    },
    {
      title: "Total Credentials",
      value: stats?.totalCredentials ?? 0,
      icon: Award,
      color: "text-sky-600",
      bg: "bg-sky-50",
      href: "/credentials",
    },
    {
      title: "Issued (Blockchain)",
      value: stats?.issuedCredentials ?? 0,
      icon: ShieldCheck,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      href: "/credentials?status=ISSUED",
    },
    {
      title: "Draft / Pending",
      value: stats?.draftCredentials ?? 0,
      icon: Clock,
      color: "text-amber-600",
      bg: "bg-amber-50",
      href: "/credentials?status=DRAFT",
    },
    {
      title: "Revoked Credentials",
      value: stats?.revokedCredentials ?? 0,
      icon: AlertCircle,
      color: "text-rose-600",
      bg: "bg-rose-50",
      href: "/credentials?status=REVOKED",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Organization Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Overview of student records, credential lifecycles, and blockchain proofs.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Link href="/credentials/new">
            <Button size="sm" className="gap-1.5">
              <PlusCircle className="w-4 h-4" />
              Issue Marksheet
            </Button>
          </Link>
          <Link href="/candidates/new">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Users className="w-4 h-4" />
              New Candidate
            </Button>
          </Link>
          <Link href="/organizations">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Building2 className="w-4 h-4" />
              Organizations
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href} className="group">
              <Card className="hover:border-slate-300 hover:shadow-md transition-all">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-500">{card.title}</p>
                    <p className="text-2xl font-bold text-slate-900 mt-1">{card.value}</p>
                  </div>
                  <div className={`p-2.5 rounded-xl ${card.bg} ${card.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* 2-Column Section: Recent Credentials + Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Credentials Table */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Credentials</CardTitle>
              <CardDescription>Latest marksheets and certificates submitted</CardDescription>
            </div>
            <Link href="/credentials">
              <Button variant="ghost" size="sm" className="text-xs text-sky-600 gap-1">
                View all <ArrowUpRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            {recentCredentials.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No credentials created yet. Click &quot;Issue Marksheet&quot; to get started.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3">Credential #</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Created</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentCredentials.map((cred) => (
                    <tr key={cred.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-slate-900 font-mono">
                        {cred.credentialNumber}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">
                        {cred.credentialType.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={cred.status} size="sm" />
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {formatDate(cred.createdAt)}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <Link href={`/credentials/${cred.id}`}>
                          <Button variant="outline" size="sm" className="text-xs py-1 px-2.5">
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>

        {/* Audit Activity Stream */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-600" />
              <CardTitle>System Activity</CardTitle>
            </div>
            <CardDescription>Recent immutable audit trail events</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            {recentAudits.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">No audit records found.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentAudits.map((log) => (
                  <div key={log.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800">
                        {log.eventType.replace(/_/g, " ")}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(log.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate font-mono">
                      {log.entityType}: {truncateHash(log.entityId, 8, 4)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
