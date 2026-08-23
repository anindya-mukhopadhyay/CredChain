"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { listCredentials, listOrganizations } from "@/lib/api";
import type { Credential, Organization, CredentialStatus } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/credentials/StatusBadge";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import { Award, PlusCircle, Search, ShieldCheck } from "lucide-react";

function CredentialsListContent() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get("status") as CredentialStatus | null;

  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string>(initialStatus || "");
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [creds, orgs] = await Promise.all([
        listCredentials({
          status: selectedStatus ? (selectedStatus as CredentialStatus) : undefined,
          organizationId: selectedOrgId || undefined,
        }),
        listOrganizations(),
      ]);
      setCredentials(creds);
      setOrganizations(orgs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load credentials";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedStatus, selectedOrgId]);

  const filteredCredentials = credentials.filter((c) => {
    const num = c.credentialNumber.toLowerCase();
    const type = c.credentialType.toLowerCase();
    const query = searchQuery.toLowerCase();
    return num.includes(query) || type.includes(query) || c.id.toLowerCase().includes(query);
  });

  const getOrgName = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    return org ? org.name : orgId.slice(0, 8);
  };

  const statusOptions = [
    { value: "", label: "All Statuses" },
    { value: "DRAFT", label: "DRAFT" },
    { value: "FINALIZED", label: "FINALIZED" },
    { value: "ISSUED", label: "ISSUED" },
    { value: "REVOKED", label: "REVOKED" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Credentials</h2>
          <p className="text-sm text-slate-500 mt-1">
            Manage academic marksheets, training records, and verify integrity on the blockchain.
          </p>
        </div>
        <Link href="/credentials/new">
          <Button className="gap-1.5 self-start">
            <PlusCircle className="w-4 h-4" />
            Issue Marksheet
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by Credential # or UUID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-mono"
          />
        </div>

        <div>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full py-2 px-3 bg-white border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
          >
            {statusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div>
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
            <Award className="w-5 h-5 text-sky-600" />
            <CardTitle>Registered Credentials</CardTitle>
          </div>
          <CardDescription>
            Showing {filteredCredentials.length} of {credentials.length} credentials
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center gap-2 text-slate-400">
              <Spinner size="md" className="text-sky-600" />
              <span className="text-xs font-medium">Loading credentials...</span>
            </div>
          ) : filteredCredentials.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No credentials found matching your filter criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Credential Number</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Organization</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Issued Date</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCredentials.map((cred) => (
                  <tr key={cred.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-900">
                      {cred.credentialNumber}
                    </td>
                    <td className="px-6 py-4 text-slate-700 font-medium">
                      {cred.credentialType.replace(/_/g, " ")}
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {getOrgName(cred.organizationId)}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={cred.status} size="sm" />
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {formatDate(cred.issueDate || cred.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/credentials/${cred.id}`}>
                          <Button variant="outline" size="sm" className="text-xs py-1 px-2.5">
                            Inspect
                          </Button>
                        </Link>
                        {cred.status === "ISSUED" && (
                          <Link href={`/verify/${cred.id}`}>
                            <Button variant="ghost" size="sm" className="text-xs py-1 px-2 text-emerald-700 hover:bg-emerald-50">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        )}
                      </div>
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

export default function CredentialsPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Spinner size="lg" className="text-sky-600" />
          <p className="text-sm font-medium">Loading credentials...</p>
        </div>
      }
    >
      <CredentialsListContent />
    </Suspense>
  );
}
