"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  getCredential,
  finalizeCredential,
  revokeCredential,
  getCandidate,
  listOrganizations,
} from "@/lib/api";
import type { Credential, Candidate, Organization, SemesterPayload } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/credentials/StatusBadge";
import { CredentialTimeline } from "@/components/credentials/CredentialTimeline";
import { BlockchainProofCard } from "@/components/credentials/BlockchainProofCard";
import { RelationshipVisualizer } from "@/components/credentials/RelationshipVisualizer";
import { FinalizeDialog } from "@/components/credentials/FinalizeDialog";
import { RevokeDialog } from "@/components/credentials/RevokeDialog";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  ShieldAlert,
  ArrowLeft,
  AlertTriangle,
  Lock,
} from "lucide-react";

export default function CredentialDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [credential, setCredential] = useState<Credential | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [isFinalizeOpen, setIsFinalizeOpen] = useState(false);
  const [isRevokeOpen, setIsRevokeOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const cred = await getCredential(id);
      setCredential(cred);

      const [cand, orgs] = await Promise.all([
        getCandidate(cred.candidateId),
        listOrganizations(),
      ]);
      setCandidate(cand);
      setOrganization(orgs.find((o) => o.id === cred.organizationId) || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load credential details";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleFinalize = async () => {
    if (!id) return;
    await finalizeCredential(id);
    await loadData();
  };

  const handleRevoke = async (reasonCode: string, note?: string) => {
    if (!id) return;
    await revokeCredential(id, { reasonCode, note });
    await loadData();
  };

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Spinner size="lg" className="text-sky-600" />
        <p className="text-sm font-medium">Loading credential & verification proof...</p>
      </div>
    );
  }

  if (error || !credential) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-3">
        <h3 className="font-semibold">Credential Not Found</h3>
        <p className="text-sm">{error || "The requested credential record could not be found."}</p>
        <Link href="/credentials">
          <Button variant="outline" size="sm">
            Back to Credentials
          </Button>
        </Link>
      </div>
    );
  }

  const payload = credential.credentialPayload as unknown as SemesterPayload;
  const subjects = Array.isArray(payload.subjects) ? payload.subjects : [];
  const semNumber = typeof payload.semester === "number" ? payload.semester : 1;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <Link href="/credentials">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                {credential.credentialNumber}
              </h2>
              <StatusBadge status={credential.status} />
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Type: {credential.credentialType.replace(/_/g, " ")} • ID: {credential.id}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {credential.status === "DRAFT" && (
            <Button onClick={() => setIsFinalizeOpen(true)} className="gap-1.5 shadow-sm">
              <Lock className="w-4 h-4" />
              Finalize Credential
            </Button>
          )}

          {credential.status === "ISSUED" && (
            <>
              <Link href={`/verify/${credential.id}`}>
                <Button variant="success" size="md" className="gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Verify On-Chain
                </Button>
              </Link>
              <Button
                variant="outline"
                size="md"
                onClick={() => setIsRevokeOpen(true)}
                className="text-rose-700 hover:bg-rose-50 border-rose-200"
              >
                <AlertTriangle className="w-4 h-4" />
                Revoke
              </Button>
            </>
          )}

          {credential.status === "REVOKED" && (
            <Link href={`/verify/${credential.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5 text-rose-700">
                <ShieldAlert className="w-4 h-4" />
                View Revocation State
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Revocation Banner if revoked */}
      {credential.status === "REVOKED" && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <div className="text-xs space-y-0.5">
            <p className="font-bold uppercase tracking-wider">Credential Has Been Revoked</p>
            <p className="text-rose-800">
              This credential was officially invalidated by the issuing authority and is recorded as inactive on-chain.
            </p>
          </div>
        </div>
      )}

      {/* Main Grid: Left = Details & Academic Payload; Right = Timeline & Blockchain Proof */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata & Parties</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Candidate Recipient</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {candidate ? `${candidate.givenName} ${candidate.familyName}` : credential.candidateId}
                </span>
                {candidate?.externalReference && (
                  <span className="text-slate-400 font-mono text-[11px] block mt-0.5">
                    Ref: {candidate.externalReference}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block">Issuing Organization</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {organization ? organization.name : credential.organizationId}
                </span>
                {organization && (
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    {organization.organizationType}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block">Program & Semester</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {payload.program || "Undergraduate Program"} — Semester {semNumber}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Academic Session</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {payload.academicYear || "2024-2025"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Issue Date</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {formatDate(credential.issueDate || credential.createdAt)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Finalized Timestamp</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {formatDate(credential.finalizedAt) || "Pending"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Academic Marksheet / Subjects Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Marksheet Statement of Marks</CardTitle>
                <CardDescription>
                  Semester {semNumber} course components and grades
                </CardDescription>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-500 block">Result Status</span>
                <span
                  className={`text-xs font-bold px-2 py-0.5 rounded ${
                    payload.result === "PASS"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {payload.result || "PASS"}
                </span>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="px-6 py-3">Subject Code</th>
                    <th className="px-6 py-3">Subject Title</th>
                    <th className="px-6 py-3 text-center">Credits</th>
                    <th className="px-6 py-3 text-center">Grade</th>
                    <th className="px-6 py-3 text-right">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-slate-400">
                        No subject modules specified in payload.
                      </td>
                    </tr>
                  ) : (
                    subjects.map((sub, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-mono font-bold text-slate-900">
                          {sub.subjectCode}
                        </td>
                        <td className="px-6 py-3 text-slate-700 font-medium">{sub.subjectName}</td>
                        <td className="px-6 py-3 text-center font-mono">{sub.credits}</td>
                        <td className="px-6 py-3 text-center font-bold text-slate-900">
                          <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                            {sub.grade}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-right font-mono text-slate-600">
                          {sub.marks ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* GPA Summary footer */}
            <div className="px-6 py-4 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Semester Grade Point Average (SGPA):</span>
              <span className="font-bold text-base text-slate-900">
                {payload.semesterGpa ?? "—"} / 10.0
              </span>
            </div>
          </Card>

          {/* Academic Progression Sequence */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Academic Chain Progression</CardTitle>
              <CardDescription>Credential relationship links for multi-semester curriculum</CardDescription>
            </CardHeader>
            <CardContent>
              <RelationshipVisualizer currentSemester={semNumber} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">
          {/* Blockchain Proof Card */}
          <BlockchainProofCard credential={credential} />

          {/* Verification Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lifecycle Timeline</CardTitle>
              <CardDescription>Immutable record of state transitions</CardDescription>
            </CardHeader>
            <CardContent>
              <CredentialTimeline credential={credential} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modals */}
      <FinalizeDialog
        isOpen={isFinalizeOpen}
        onClose={() => setIsFinalizeOpen(false)}
        onConfirm={handleFinalize}
        credentialNumber={credential.credentialNumber}
      />

      <RevokeDialog
        isOpen={isRevokeOpen}
        onClose={() => setIsRevokeOpen(false)}
        onConfirm={handleRevoke}
        credentialNumber={credential.credentialNumber}
      />
    </div>
  );
}
