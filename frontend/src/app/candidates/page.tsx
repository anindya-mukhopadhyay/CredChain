"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { listCandidates, listOrganizations } from "@/lib/api";
import type { Candidate, Organization } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import { Users, UserPlus, Search, Building2, ArrowRight } from "lucide-react";

export default function CandidatesPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async (orgId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const [cands, orgs] = await Promise.all([
        listCandidates(orgId || undefined),
        listOrganizations(),
      ]);
      setCandidates(cands);
      setOrganizations(orgs);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load candidates";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedOrgId);
  }, [selectedOrgId]);

  const filteredCandidates = candidates.filter((c) => {
    const fullName = `${c.givenName} ${c.familyName}`.toLowerCase();
    const ref = (c.externalReference || "").toLowerCase();
    const query = searchQuery.toLowerCase();
    return fullName.includes(query) || ref.includes(query) || c.id.toLowerCase().includes(query);
  });

  const getOrgName = (orgId: string) => {
    const org = organizations.find((o) => o.id === orgId);
    return org ? org.name : orgId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Candidates</h2>
          <p className="text-sm text-slate-500 mt-1">
            Registered students and professionals whose credentials are authenticated on-chain.
          </p>
        </div>
        <Link href="/candidates/new">
          <Button className="gap-1.5 self-start">
            <UserPlus className="w-4 h-4" />
            New Candidate
          </Button>
        </Link>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, student ID, roll number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-lg text-sm placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
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
            <Users className="w-5 h-5 text-sky-600" />
            <CardTitle>Candidate Directory</CardTitle>
          </div>
          <CardDescription>
            Showing {filteredCandidates.length} of {candidates.length} candidates
          </CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center gap-2 text-slate-400">
              <Spinner size="md" className="text-sky-600" />
              <span className="text-xs font-medium">Loading candidate records...</span>
            </div>
          ) : filteredCandidates.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No candidates found matching your criteria.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Candidate Reference</th>
                  <th className="px-6 py-3">Full Name</th>
                  <th className="px-6 py-3">Organization</th>
                  <th className="px-6 py-3">Date of Birth</th>
                  <th className="px-6 py-3">Registered</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCandidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-slate-900">
                      {candidate.externalReference || "—"}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {candidate.givenName} {candidate.familyName}
                    </td>
                    <td className="px-6 py-4 text-slate-600 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{getOrgName(candidate.organizationId)}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">{candidate.dateOfBirth || "—"}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(candidate.createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <Link href={`/candidates/${candidate.id}`}>
                        <Button variant="outline" size="sm" className="text-xs py-1 px-2.5 gap-1">
                          Profile <ArrowRight className="w-3 h-3" />
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
    </div>
  );
}
