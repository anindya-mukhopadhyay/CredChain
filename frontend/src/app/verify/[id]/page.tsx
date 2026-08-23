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
import {
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Lock,
  ArrowLeft,
  ShieldAlert,
  Clock,
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
      {/* Back button */}
      <div className="flex items-center justify-between">
        <Link href="/verify">
          <Button variant="ghost" size="sm" className="gap-1.5 text-slate-600">
            <ArrowLeft className="w-4 h-4" /> Verify another
          </Button>
        </Link>
        <Button variant="outline" size="sm" onClick={runVerification} className="text-xs">
          Re-verify proof
        </Button>
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
                CREDENTIAL VERIFIED
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
                TAMPERING DETECTED
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

      {/* 4. PENDING_BLOCKCHAIN */}
      {verifyResult.status === "PENDING_BLOCKCHAIN" && (
        <div className="bg-sky-700 text-white rounded-2xl p-6 sm:p-8 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs uppercase tracking-widest font-bold text-sky-300">
                Pending Ledger Confirmation
              </span>
              <h2 className="text-2xl font-bold mt-1">PENDING BLOCKCHAIN</h2>
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
                      {payload.subjects.map((sub, i) => (
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
    </div>
  );
}
