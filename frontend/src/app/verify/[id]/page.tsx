"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  verifyCredential,
  getCredential,
  getCandidate,
  listOrganizations,
} from "@/lib/api";
import type {
  VerificationResult,
  Credential,
  Candidate,
  Organization,
  SemesterPayload,
} from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import { CredentialShareModal } from "@/components/credentials/CredentialShareModal";
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Lock,
  ArrowLeft,
  ShieldAlert,
  Clock,
  Share2,
} from "lucide-react";

export default function VerifyResultPage() {
  const params = useParams();
  const id = params.id as string;

  const [verifyResult, setVerifyResult] = useState<VerificationResult | null>(null);
  const [credential, setCredential] = useState<Credential | null>(null);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const runVerification = async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      setError(null);

      const result = await verifyCredential(id);
      setVerifyResult(result);

      // Attempt to load associated metadata if credential exists
      try {
        const cred = await getCredential(id);
        setCredential(cred);
        const [cand, orgs] = await Promise.all([
          getCandidate(cred.candidateId),
          listOrganizations(),
        ]);
        setCandidate(cand);
        setOrganization(orgs.find((o) => o.id === cred.organizationId) || null);
      } catch {
        // If metadata read fails, verifyResult is still valid
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to execute cryptographic verification";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runVerification();
  }, [id]);

  if (isLoading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Spinner size="lg" className="text-sky-600" />
        <p className="text-sm font-medium">Querying blockchain contract & verifying proof...</p>
      </div>
    );
  }

  if (error || !verifyResult) {
    return (
      <div className="max-w-2xl mx-auto p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 space-y-4">
        <div className="flex items-center gap-2 font-semibold">
          <AlertOctagon className="w-5 h-5 text-rose-600" />
          <span>Verification Error</span>
        </div>
        <p className="text-sm">{error || "Unable to retrieve verification response."}</p>
        <Link href="/verify">
          <Button variant="outline" size="sm">
            Search Another ID
          </Button>
        </Link>
      </div>
    );
  }

  const payload = credential?.credentialPayload as unknown as SemesterPayload | undefined;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back button and Header actions */}
      <div className="flex items-center justify-between">
        <Link href="/verify">
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
            <ArrowLeft className="w-4 h-4" /> Verify another
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsShareOpen(true)} className="text-xs gap-1 text-indigo-600 border-indigo-200 hover:bg-indigo-50">
            <Share2 className="w-3.5 h-3.5" />
            Share / QR
          </Button>
          <Button variant="outline" size="sm" onClick={runVerification} className="text-xs">
            Re-verify proof
          </Button>
        </div>
      </div>

      {/* Prominent Verification Result Banners */}

      {/* 1. VERIFIED */}
      {verifyResult.status === "VERIFIED" && (
        <div className="bg-emerald-600 text-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest font-bold text-emerald-200">
                Official Authenticity Report
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                ✓ CREDENTIAL VERIFIED
              </h2>
            </div>
            <div className="p-3 bg-emerald-500/40 rounded-2xl border border-emerald-400/50">
              <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 text-xs font-semibold text-emerald-50 border-t border-emerald-500/50">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Integrity Verified</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Blockchain Proof Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-200 shrink-0" />
              <span>Tamper-Free Record</span>
            </div>
          </div>
        </div>
      )}

      {/* 2. TAMPERED */}
      {verifyResult.status === "TAMPERED" && (
        <div className="bg-rose-600 text-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest font-bold text-rose-200">
                Security Warning
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                ⚠ CREDENTIAL INTEGRITY FAILED
              </h2>
            </div>
            <div className="p-3 bg-rose-500/40 rounded-2xl border border-rose-400/50">
              <AlertOctagon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          </div>

          <div className="p-3.5 bg-rose-700/60 rounded-xl text-xs space-y-1 text-rose-100 border border-rose-500/40">
            <p className="font-bold text-white">Credential integrity check failed.</p>
            <p className="leading-relaxed">
              The operational credential data in the database does not match the cryptographic hash
              recorded on the blockchain registry during issuance.
            </p>
          </div>
        </div>
      )}

      {/* 3. REVOKED */}
      {verifyResult.status === "REVOKED" && (
        <div className="bg-amber-600 text-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest font-bold text-amber-200">
                Invalidated Record
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                CREDENTIAL REVOKED
              </h2>
            </div>
            <div className="p-3 bg-amber-500/40 rounded-2xl border border-amber-400/50">
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          </div>

          <p className="text-xs text-amber-100 leading-relaxed border-t border-amber-500/50 pt-3">
            This credential was previously issued but has been officially revoked by the issuing
            institution and is no longer valid.
          </p>
        </div>
      )}

      {/* 3b. ISSUED_WITH_REVOKED_PREREQUISITE */}
      {verifyResult.status === "ISSUED_WITH_REVOKED_PREREQUISITE" && (
        <div className="bg-rose-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest font-bold text-rose-200">
                Prerequisite Invalidation Detected
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                DEGREE HAS A REVOKED PREREQUISITE
              </h2>
            </div>
            <div className="p-3 bg-rose-500/40 rounded-2xl border border-rose-400/50">
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          </div>

          <p className="text-xs text-rose-100 leading-relaxed border-t border-rose-600/50 pt-3">
            This degree credential is registered on-chain, but one or more underlying prerequisite semester credentials
            have been officially REVOKED by the issuing university.
          </p>

          {verifyResult.affectedPrerequisites && verifyResult.affectedPrerequisites.length > 0 && (
            <div className="bg-rose-900/40 border border-rose-500/40 rounded-xl p-3 space-y-1.5 text-xs">
              <span className="font-bold text-rose-200 block text-[11px] uppercase tracking-wider">
                Invalidated Prerequisite Credentials:
              </span>
              {verifyResult.affectedPrerequisites.map((p, i) => (
                <div key={i} className="flex items-center justify-between text-rose-100 bg-rose-950/40 px-2.5 py-1.5 rounded-lg font-mono">
                  <span>Semester {p.semesterNumber} Marksheet ({p.credentialNumber || p.credentialId.slice(0, 8)})</span>
                  <span className="bg-rose-500/40 text-rose-200 px-2 py-0.5 rounded text-[10px] font-bold">REVOKED</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3c. UNTRUSTED_ISSUER */}
      {verifyResult.status === "UNTRUSTED_ISSUER" && (
        <div className="bg-amber-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-4 animate-in zoom-in-95 duration-200">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <span className="text-xs uppercase tracking-widest font-bold text-amber-200">
                Unauthorized Provenance Detected
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                ISSUER COULD NOT BE TRUSTED
              </h2>
            </div>
            <div className="p-3 bg-amber-500/40 rounded-2xl border border-amber-400/50">
              <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          </div>

          <p className="text-xs text-amber-100 leading-relaxed border-t border-amber-600/50 pt-3">
            An on-chain record exists for this credential, but the registering Ethereum address ({verifyResult.issuerAddress || "unknown"})
            is not an authorized issuer holding ISSUER_ROLE on the smart contract registry.
          </p>
        </div>
      )}

      {/* 4. PENDING_BLOCKCHAIN */}
      {verifyResult.status === "PENDING_BLOCKCHAIN" && (
        <div className="bg-sky-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-sky-300">
                Pending Ledger Confirmation
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                BLOCKCHAIN VERIFICATION PENDING
              </h2>
            </div>
            <Clock className="w-8 h-8 text-sky-300" />
          </div>
          <p className="text-xs text-sky-100">
            This credential has been finalized in the database and is queued for blockchain transaction inclusion.
          </p>
        </div>
      )}

      {/* 5. INVALID or NOT_FOUND */}
      {(verifyResult.status === "INVALID" || verifyResult.status === "NOT_FOUND") && (
        <div className="bg-slate-800 text-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-slate-400">
                Status Report
              </span>
              <h2 className="text-2xl font-bold mt-1">
                {verifyResult.status === "NOT_FOUND" ? "CREDENTIAL NOT FOUND" : "INVALID / UNFINALIZED"}
              </h2>
            </div>
            <ShieldAlert className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-xs text-slate-300">
            {verifyResult.status === "NOT_FOUND"
              ? "No credential record matches this identifier in the registry."
              : "This credential exists as a DRAFT and has not yet been cryptographically finalized."}
          </p>
        </div>
      )}

      {/* Verified Details Card */}
      {credential && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Credential Information</CardTitle>
            <CardDescription>Verified details retrieved from issuing organization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
              <div>
                <span className="text-slate-500 block">Candidate Recipient</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {candidate ? `${candidate.givenName} ${candidate.familyName}` : "—"}
                </span>
                {candidate?.externalReference && (
                  <span className="text-slate-400 font-mono text-[11px] block mt-0.5">
                    Roll/ID: {candidate.externalReference}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block">Issuing Organization</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {organization ? organization.name : "—"}
                </span>
                {organization && (
                  <span className="text-slate-400 text-[11px] block mt-0.5">
                    {organization.organizationType}
                  </span>
                )}
              </div>

              <div>
                <span className="text-slate-500 block">Credential Number</span>
                <span className="font-mono font-semibold text-slate-900 mt-0.5 block">
                  {credential.credentialNumber}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Issue Date</span>
                <span className="font-semibold text-slate-900 mt-0.5 block">
                  {formatDate(credential.issueDate || credential.createdAt)}
                </span>
              </div>
            </div>

            {/* Degree Chain Verification Breakdown if BTech Degree */}
            {verifyResult.chainVerification && (
              <div className="space-y-4 pt-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3.5 bg-indigo-50/80 border border-indigo-200 rounded-xl">
                  <div className="space-y-0.5">
                    <div className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-indigo-600" />
                      Constituent 8-Semester Academic Chain Proofs
                    </div>
                    <div className="text-[11px] text-indigo-800">
                      {verifyResult.chainVerification.verifiedSemestersCount} of {verifyResult.chainVerification.totalConstituentSemesters} semester marksheets cryptographically verified
                    </div>
                  </div>
                  {verifyResult.degreeDetails && (
                    <div className="flex items-center gap-2">
                      <span className="bg-indigo-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-md">
                        CGPA: {verifyResult.degreeDetails.cumulativeGpa.toFixed(2)} / 10.0
                      </span>
                      <span className="bg-white border border-indigo-300 text-indigo-900 text-[11px] font-bold px-2.5 py-1 rounded-md">
                        {verifyResult.degreeDetails.classification.replace(/_/g, " ")}
                      </span>
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-2.5">Semester</th>
                        <th className="px-4 py-2.5">Credential #</th>
                        <th className="px-4 py-2.5 text-center">Result</th>
                        <th className="px-4 py-2.5 text-center">SGPA</th>
                        <th className="px-4 py-2.5 text-center">Credits</th>
                        <th className="px-4 py-2.5 text-right">Verification Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {verifyResult.chainVerification.constituentSemesters.map((sem) => (
                        <tr key={sem.semesterNumber} className="hover:bg-slate-50/50">
                          <td className="px-4 py-2.5 font-bold text-slate-900">
                            Semester {sem.semesterNumber}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-600">
                            {sem.credentialNumber}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${sem.isPassed
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                                }`}
                            >
                              {sem.isPassed ? "PASS" : "FAIL"}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-center font-semibold text-slate-800">
                            {sem.semesterGpa ? sem.semesterGpa.toFixed(2) : "—"}
                          </td>
                          <td className="px-4 py-2.5 text-center text-slate-600">
                            {sem.credits}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span
                              className={`inline-flex items-center gap-1 font-bold text-[11px] ${sem.status === "VERIFIED"
                                  ? "text-emerald-700"
                                  : sem.status === "TAMPERED"
                                    ? "text-rose-700"
                                    : sem.status === "REVOKED"
                                      ? "text-rose-800"
                                      : "text-amber-700"
                                }`}
                            >
                              {sem.status === "VERIFIED" ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 inline" />
                              )}
                              {sem.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Academic Marksheet components if present */}
            {payload?.subjects && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs">Academic Marksheet</span>
                  <span className="font-bold text-slate-900 text-xs">
                    SGPA: {payload.semesterGpa ?? "—"} / 10.0
                  </span>
                </div>
                <div className="overflow-x-auto rounded-lg border border-slate-200/80">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold">
                      <tr>
                        <th className="px-4 py-2">Code</th>
                        <th className="px-4 py-2">Subject</th>
                        <th className="px-4 py-2 text-center">Credits</th>
                        <th className="px-4 py-2 text-center">Grade</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payload.subjects.map((sub: import("@/types").SubjectItem, i: number) => (
                        <tr key={i}>
                          <td className="px-4 py-2 font-mono font-medium">{sub.subjectCode}</td>
                          <td className="px-4 py-2">{sub.subjectName}</td>
                          <td className="px-4 py-2 text-center font-mono">{sub.credits}</td>
                          <td className="px-4 py-2 text-center font-bold">{sub.grade}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Cryptographic Proof Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-600" />
            <CardTitle className="text-sm">Cryptographic Fingerprint & Chain Reference</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-xs">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="font-medium text-slate-500 block mb-1">Credential ID (UUID)</span>
              <span className="font-mono text-slate-900 text-[11px] break-all block">{id}</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="font-medium text-slate-500 block mb-1">Registry Smart Contract</span>
              <span className="font-mono text-slate-900 text-[11px] break-all block">
                0x5FbDB2315678afecb367f032d93F642f64180aa3
              </span>
            </div>

            {verifyResult.dbHash && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 md:col-span-2">
                <span className="font-medium text-slate-500 block mb-1">Database Stored Hash</span>
                <span className="font-mono text-slate-900 text-[11px] break-all block bg-white p-2 rounded border border-slate-200/60">
                  {verifyResult.dbHash}
                </span>
              </div>
            )}

            {verifyResult.blockchainHash && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 md:col-span-2">
                <span className="font-medium text-slate-500 block mb-1">Blockchain Registered Proof</span>
                <span className="font-mono text-slate-900 text-[11px] break-all block bg-white p-2 rounded border border-slate-200/60">
                  {verifyResult.blockchainHash}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <CredentialShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        credentialId={id}
        credentialNumber={credential?.credentialNumber || id.slice(0, 8)}
        credentialTitle={
          verifyResult.degreeDetails
            ? `${verifyResult.degreeDetails.degreeTitle} (Degree Verification)`
            : `Credential ${credential?.credentialNumber || id.slice(0, 8)}`
        }
      />
    </div>
  );
}
