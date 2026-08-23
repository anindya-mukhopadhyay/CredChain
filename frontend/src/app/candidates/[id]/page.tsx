"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getCandidate, listCredentials, listOrganizations } from "@/lib/api";
import type { Candidate, Credential, Organization } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { StatusBadge } from "@/components/credentials/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import { Users, Building2, Award, PlusCircle, ArrowLeft } from "lucide-react";

export default function CandidateDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadCandidateData() {
      if (!id) return;
      try {
        setIsLoading(true);
        setError(null);
        const [cand, creds, orgs] = await Promise.all([
          getCandidate(id),
          listCredentials({ candidateId: id }),
          listOrganizations(),
        ]);
        setCandidate(cand);
        setCredentials(creds);
        const foundOrg = orgs.find((o) => o.id === cand.organizationId);
        setOrganization(foundOrg || null);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Failed to load candidate record";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }
    loadCandidateData();
  }, [id]);

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Spinner size="lg" className="text-sky-600" />
        <p className="text-sm font-medium">Loading candidate profile...</p>
      </div>
    );
  }

  if (error || !candidate) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-3">
        <h3 className="font-semibold">Candidate Not Found</h3>
        <p className="text-sm">{error || "The requested candidate ID does not exist."}</p>
        <Link href="/candidates">
          <Button variant="outline" size="sm">
            Back to Candidates
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <Link href="/candidates">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {candidate.givenName} {candidate.familyName}
            </h2>
            <p className="text-xs font-mono text-slate-500 mt-0.5">
              Ref: {candidate.externalReference || "N/A"} • ID: {candidate.id}
            </p>
          </div>
        </div>

        <Link href={`/credentials/new?candidateId=${candidate.id}&organizationId=${candidate.organizationId}`}>
          <Button className="gap-1.5 self-start">
            <PlusCircle className="w-4 h-4" />
            Issue Credential
          </Button>
        </Link>
      </div>

      {/* Profile Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-600" />
              <CardTitle className="text-base">Profile Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div>
              <span className="text-slate-500 block">Organization</span>
              <div className="flex items-center gap-1.5 font-medium text-slate-900 mt-1">
                <Building2 className="w-3.5 h-3.5 text-slate-400" />
                <span>{organization ? organization.name : candidate.organizationId}</span>
              </div>
            </div>

            <div>
              <span className="text-slate-500 block">Date of Birth</span>
              <span className="font-medium text-slate-900 mt-1 block">
                {candidate.dateOfBirth || "Not provided"}
              </span>
            </div>

            <div>
              <span className="text-slate-500 block">Registered On</span>
              <span className="font-medium text-slate-900 mt-1 block">
                {formatDate(candidate.createdAt)}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Credential Records */}
        <Card className="md:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-base">Issued Credentials & Marksheets</CardTitle>
              </div>
              <CardDescription>
                Academic credentials and achievements linked to this candidate
              </CardDescription>
            </div>
          </CardHeader>
          <div className="overflow-x-auto">
            {credentials.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                No credentials issued for this candidate yet.
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                  <tr>
                    <th className="px-6 py-3">Credential #</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3">Issue Date</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {credentials.map((cred) => (
                    <tr key={cred.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-3.5 font-semibold font-mono text-slate-900">
                        {cred.credentialNumber}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600">
                        {cred.credentialType.replace(/_/g, " ")}
                      </td>
                      <td className="px-6 py-3.5">
                        <StatusBadge status={cred.status} size="sm" />
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {formatDate(cred.issueDate || cred.createdAt)}
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
      </div>
    </div>
  );
}
