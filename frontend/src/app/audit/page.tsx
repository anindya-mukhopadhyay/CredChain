"use client";

import React, { useEffect, useState } from "react";
import { listAuditLogs, listOrganizations } from "@/lib/api";
import type { AuditLog, Organization } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { formatDateTime, truncateHash } from "@/lib/utils";
import { Activity, Search } from "lucide-react";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [auditData, orgs] = await Promise.all([
        listAuditLogs({ organizationId: selectedOrgId || undefined }),
        listOrganizations(),
      ]);
      setLogs(auditData);
      setOrganizations(orgs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load system audit trail";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedOrgId]);

  const filteredLogs = logs.filter((log) => {
    const type = log.eventType.toLowerCase();
    const entity = (log.entityId || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return type.includes(query) || entity.includes(query);
  });

  const getOrgName = (orgId: string | null) => {
    if (!orgId) return "System";
    const org = organizations.find((o) => o.id === orgId);
    return org ? org.name : orgId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Audit Trail</h2>
          <p className="text-sm text-slate-500 mt-1">
            Immutable application-level activity logs and security events.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by event type or entity ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
          />
        </div>
        <div className="w-full sm:w-64">
          <select
            value={selectedOrgId}
            onChange={(e) => setSelectedOrgId(e.target.value)}
            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          >
            <option value="">All Organizations</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" />
            <CardTitle>System Activity Logs</CardTitle>
          </div>
          <CardDescription>
            Showing {filteredLogs.length} of {logs.length} logged events
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center gap-2 text-slate-400">
              <Spinner size="md" className="text-sky-600" />
              <span className="text-xs font-medium">Loading audit trail...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No audit records found matching your criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Event Type</th>
                  <th className="px-6 py-3">Organization</th>
                  <th className="px-6 py-3">Target Entity</th>
                  <th className="px-6 py-3">Event Metadata</th>
                  <th className="px-6 py-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {log.eventType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {getOrgName(log.organizationId)}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-700">
                      {log.entityType}: {truncateHash(log.entityId, 8, 4)}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono text-[11px] max-w-xs truncate">
                      {JSON.stringify(log.eventMetadata)}
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDateTime(log.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
