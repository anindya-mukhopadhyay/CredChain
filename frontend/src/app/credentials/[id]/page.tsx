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
import type { Credential, Candidate, Organization, SemesterPayload, BTechDegreePayload } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/credentials/StatusBadge";
import { CredentialTimeline } from "@/components/credentials/CredentialTimeline";
import { BlockchainProofCard } from "@/components/credentials/BlockchainProofCard";
import { RelationshipVisualizer } from "@/components/credentials/RelationshipVisualizer";
import { FinalizeDialog } from "@/components/credentials/FinalizeDialog";
import { RevokeDialog } from "@/components/credentials/RevokeDialog";
import { CredentialQRCode } from "@/components/credentials/CredentialQRCode";
import { CredentialShareModal } from "@/components/credentials/CredentialShareModal";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import {
  ShieldCheck,
  ArrowLeft,
  AlertTriangle,
  Lock,
  Share2,
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
  const [isShareOpen, setIsShareOpen] = useState(false);

  const loadData = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);
      const cred = await getCredential(id);
      setCredential(cred);

      if (cred.candidateId) {
        try {
          const cand = await getCandidate(cred.candidateId);
          setCandidate(cand);
        } catch {
          // Candidate might be restricted
        }
      }

      if (cred.organizationId) {
        try {
          const orgs = await listOrganizations();
          const org = orgs.find((o) => o.id === cred.organizationId);
          if (org) setOrganization(org);
        } catch {
          // Organization might be restricted
        }
      }
    } catch (err: unknown) {
      setError((err as Error).message || "Failed to load credential details");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleFinalize = async () => {
    if (!credential) return;
    try {
      await finalizeCredential(credential.id);
      setIsFinalizeOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to finalize credential");
    }
  };

  const handleRevoke = async (reasonCode: string, reasonNote?: string) => {
    if (!credential) return;
    try {
      await revokeCredential(credential.id, { reasonCode, note: reasonNote });
      setIsRevokeOpen(false);
      await loadData();
    } catch (err: unknown) {
      alert((err as Error).message || "Failed to revoke credential");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <Spinner size="lg" />
        <p className="text-sm text-slate-500">Loading credential details...</p>
      </div>
    );
  }

  if (error || !credential) {
    return (
      <div className="space-y-4">
        <Link href="/credentials">
          <Button variant="ghost" size="sm" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Credentials
          </Button>
        </Link>
        <Card className="border-rose-200 bg-rose-50/50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-rose-700">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <p className="text-sm font-medium">{error || "Credential not found"}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const payload = (credential.credentialPayload || {}) as SemesterPayload;
  const isDegree = credential.credentialType === "BTECH_DEGREE";
  const degreePayload = (credential.credentialPayload || {}) as unknown as Partial<BTechDegreePayload>;
  const semNumber = payload.semester ?? 1;
  const subjects = (Array.isArray(payload.subjects) ? payload.subjects : []) as import("@/types").SubjectItem[];

  return (
    <div className="space-y-6">
      {/* Header and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <Link href="/credentials">
            <Button variant="ghost" size="sm" className="p-2">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                {credential.credentialNumber}
              </h2>
              <StatusBadge status={credential.status} />
            </div>
            <p className="text-xs text-slate-500 mt-1">
              UUID: <span className="font-mono text-slate-700">{credential.id}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons depending on status */}
        <div className="flex items-center gap-2 flex-wrap">
          {credential.status !== "DRAFT" && (
            <Button
              variant="outline"
              onClick={() => setIsShareOpen(true)}
              className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
            >
              <Share2 className="w-4 h-4" />
              Share Credential
            </Button>
          )}

          {credential.status === "DRAFT" && (
            <Button onClick={() => setIsFinalizeOpen(true)} className="gap-1.5 bg-emerald-600 hover:bg-emerald-700">
              <Lock className="w-4 h-4" />
              Finalize & Register
            </Button>
          )}

          {(credential.status === "FINALIZED" || credential.status === "ISSUED") && (
            <Button
              variant="outline"
              onClick={() => setIsRevokeOpen(true)}
              className="gap-1.5 text-rose-600 border-rose-200 hover:bg-rose-50"
            >
              <AlertTriangle className="w-4 h-4" />
              Revoke
            </Button>
          )}

          {credential.status !== "DRAFT" && (
            <Link href={`/verify/${credential.id}`}>
              <Button variant="outline" className="gap-1.5 border-sky-200 text-sky-700 hover:bg-sky-50">
                <ShieldCheck className="w-4 h-4" />
                Public Verification Portal
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Main Grid: 2 Cols Left, 1 Col Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Credential & Candidate Details</CardTitle>
              <CardDescription>Academic identity and program metadata</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 block">Candidate Full Name</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {candidate ? `${candidate.givenName} ${candidate.familyName}` : "—"}
                </span>
                {candidate?.externalReference && (
                  <span className="text-slate-400 font-mono text-[11px] block mt-0.5">
                    Roll No: {candidate.externalReference}
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
                  {isDegree
                    ? `${degreePayload.programName || "Bachelor of Technology"} (Degree)`
                    : `${payload.program || "Undergraduate Program"} — Semester ${semNumber}`}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Academic Session</span>
                <span className="font-semibold text-slate-900 mt-1 block">
                  {isDegree
                    ? `Graduation ${degreePayload.issueYear || degreePayload.graduationDate || "2025"}`
                    : payload.academicYear || "2024-2025"}
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

          {/* If BTECH_DEGREE: Render Official Degree Certificate View */}
          {isDegree ? (
            <Card className="border-indigo-200 bg-linear-to-b from-white to-slate-50/50 shadow-sm overflow-hidden">
              <CardHeader className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-indigo-400 text-xs font-bold uppercase tracking-wider">
                      Official Degree Certificate
                    </div>
                    <CardTitle className="text-xl text-white mt-1">
                      {degreePayload.degreeTitle || "Bachelor of Technology"}
                    </CardTitle>
                  </div>
                  <div className="text-right">
                    <span className="bg-amber-400/20 border border-amber-400/30 text-amber-300 px-3 py-1 rounded-full text-xs font-bold">
                      {(degreePayload.classification || "PASS").replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-xs">Cumulative GPA</div>
                    <div className="text-2xl font-bold text-indigo-600 mt-1">
                      {Number(degreePayload.cumulativeGpa || 0).toFixed(2)}
                      <span className="text-sm font-normal text-slate-400"> / 10.0</span>
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-xs">Total Credits Earned</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">
                      {degreePayload.totalCreditsEarned || 0}
                    </div>
                  </div>
                  <div className="bg-white p-4 rounded-xl border border-slate-200 col-span-2 sm:col-span-1">
                    <div className="text-slate-500 text-xs">Semesters Completed</div>
                    <div className="text-2xl font-bold text-emerald-600 mt-1">8 / 8</div>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs text-indigo-900 space-y-1">
                  <div className="font-semibold">Cryptographic Commitment Hash (DAG Root):</div>
                  <div className="font-mono text-[11px] text-indigo-700 break-all select-all">
                    {credential.canonicalHash || "Pending finalization"}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Marksheet Subject Breakdown Card */
            <Card className="overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm">Semester {semNumber} Marksheet & Grades</CardTitle>
                    <CardDescription>Verified academic performance for Semester {semNumber}</CardDescription>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
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
                    {subjects.map((sub: import("@/types").SubjectItem, i: number) => (
                      <tr key={i} className="hover:bg-slate-50/50">
                        <td className="px-6 py-3 font-mono font-medium text-slate-700">
                          {sub.subjectCode || `SUB-${i + 1}`}
                        </td>
                        <td className="px-6 py-3 font-medium text-slate-900">
                          {sub.subjectName || "Subject"}
                        </td>
                        <td className="px-6 py-3 text-center text-slate-600">{sub.credits || 0}</td>
                        <td className="px-6 py-3 text-center font-bold text-slate-800">
                          {sub.grade || "P"}
                        </td>
                        <td className="px-6 py-3 text-right text-slate-600">
                          {sub.marks !== undefined ? sub.marks : "-"}
                        </td>
                      </tr>
                    ))}
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
          )}

          {/* Academic Progression Sequence for marksheets */}
          {credential.credentialType !== "BTECH_DEGREE" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Academic Chain Progression</CardTitle>
                <CardDescription>Credential relationship links for multi-semester curriculum</CardDescription>
              </CardHeader>
              <CardContent>
                <RelationshipVisualizer currentSemester={semNumber} />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column (1 Col) */}
        <div className="space-y-6">
          {/* Public QR Code Verification Card */}
          <CredentialQRCode
            credentialId={credential.id}
            credentialNumber={credential.credentialNumber}
            status={credential.status}
          />

          {/* Blockchain Proof Card */}
          <BlockchainProofCard credential={credential} />

          {/* Verification Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lifecycle Timeline</CardTitle>
              <CardDescription>Audit timestamps and status lifecycle</CardDescription>
            </CardHeader>
            <CardContent>
              <CredentialTimeline credential={credential} />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Share Modal */}
      <CredentialShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        credentialId={credential.id}
        credentialNumber={credential.credentialNumber}
        credentialTitle={
          isDegree
            ? `${degreePayload.degreeTitle || "B.Tech Degree"} (${candidate?.givenName || "Student"})`
            : `Semester ${semNumber} Marksheet (${candidate?.givenName || "Student"})`
        }
      />

      {/* Finalize Dialog */}
      <FinalizeDialog
        isOpen={isFinalizeOpen}
        onClose={() => setIsFinalizeOpen(false)}
        onConfirm={handleFinalize}
        credentialNumber={credential.credentialNumber}
      />

      {/* Revoke Dialog */}
      <RevokeDialog
        isOpen={isRevokeOpen}
        onClose={() => setIsRevokeOpen(false)}
        onConfirm={handleRevoke}
        credentialNumber={credential.credentialNumber}
      />
    </div>
  );
}
