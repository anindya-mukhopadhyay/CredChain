"use client";

import React from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import {
  ShieldCheck,
  Lock,
  Database,
  GraduationCap,
  QrCode,
  ArrowRight,
  CheckCircle2,
  Layers,
  FileCheck,
  LogIn,
  LayoutDashboard,
  Building2,
} from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-6 pb-12 sm:pb-16 text-center">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200/80 text-sky-700 text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            Blockchain-Backed Academic Registry
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Verify Academic Credentials with{" "}
            <span className="bg-linear-to-r from-sky-600 to-indigo-600 bg-clip-text text-transparent">
              Cryptographic Trust
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            CredChain connects multi-semester academic marksheets and B.Tech degree transcripts to
            tamper-evident cryptographic proofs and blockchain-backed verification.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3.5 pt-2">
            <Link href="/verify">
              <Button size="lg" className="text-sm font-semibold gap-2 px-6 py-3 shadow-md">
                <ShieldCheck className="w-4 h-4" />
                Verify a Credential
              </Button>
            </Link>

            {user ? (
              <Link href="/dashboard">
                <Button variant="outline" size="lg" className="text-sm font-semibold gap-2 px-6 py-3">
                  <LayoutDashboard className="w-4 h-4" />
                  Go to Dashboard
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline" size="lg" className="text-sm font-semibold gap-2 px-6 py-3">
                  <LogIn className="w-4 h-4" />
                  Issuer Login
                </Button>
              </Link>
            )}
          </div>

          {/* Trust Highlights Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto pt-6 text-left">
            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Zero-PII On-Chain
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Sensitive data stays off-chain</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                SHA-256 Commitments
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Deterministic canonical hashing</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />
                8-Semester DAG Chain
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">Prerequisite tree evaluation</p>
            </div>

            <div className="p-3 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
              <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />
                Smart Contract Proofs
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">EVM-anchored provenance</p>
            </div>
          </div>
        </div>
      </section>

      {/* How CredChain Works Section */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            How CredChain Works
          </h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            A three-step cryptographic pipeline ensuring academic integrity from classroom to recruiter.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm">
              1
            </div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-indigo-600" />
              Issue & Structure Marksheet
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Authorized university registrars create semester marksheets with subject codes, credits,
              marks, and SGPA calculations in DRAFT status.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-sm">
              2
            </div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <Lock className="w-5 h-5 text-sky-600" />
              Cryptographic Anchoring
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Records are normalized into canonical JSON representations and hashed with SHA-256. The resulting
              fingerprint is registered on the CredentialRegistry smart contract.
            </p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-sm">
              3
            </div>
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-emerald-600" />
              Public QR Verification
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Recruiters and verifiers scan zero-PII QR codes or search the credential ID to verify authenticity,
              tamper detection, and prerequisite validity in seconds.
            </p>
          </div>
        </div>
      </section>

      {/* Credential Lifecycle Section */}
      <section className="bg-slate-900 text-white rounded-3xl p-8 sm:p-10 space-y-8 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="space-y-2 relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-sky-400">
            Lifecycle & State Progression
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Deterministic Credential States
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
            Every credential moves through clear, auditable states with full cryptographic tracking.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10 text-xs">
          <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
            <span className="font-bold text-slate-300 block">DRAFT</span>
            <p className="text-[11px] text-slate-400">Editable marksheet before cryptographic lock.</p>
          </div>

          <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
            <span className="font-bold text-sky-400 block">FINALIZED</span>
            <p className="text-[11px] text-slate-400">Canonical hash calculated and locked off-chain.</p>
          </div>

          <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
            <span className="font-bold text-indigo-400 block">BLOCKCHAIN PENDING</span>
            <p className="text-[11px] text-slate-400">Queued for on-chain contract confirmation.</p>
          </div>

          <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
            <span className="font-bold text-emerald-400 block">ISSUED</span>
            <p className="text-[11px] text-slate-400">Anchored on-chain with active proof.</p>
          </div>

          <div className="p-3.5 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-1">
            <span className="font-bold text-teal-400 block">VERIFIED</span>
            <p className="text-[11px] text-slate-400">Public integrity and provenance confirmed.</p>
          </div>

          <div className="p-3.5 bg-slate-800/80 border border-rose-900/60 rounded-xl space-y-1">
            <span className="font-bold text-rose-400 block">REVOKED</span>
            <p className="text-[11px] text-slate-400">Invalidated on-chain with audit reasoning.</p>
          </div>
        </div>
      </section>

      {/* 8-Semester Academic Chain & B.Tech Degree Section */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-7 h-7 text-indigo-600" />
              8-Semester B.Tech Academic Chain
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              Automated eligibility evaluation, credit-weighted CGPA computation, and prerequisite verification.
            </p>
          </div>

          <Link href="/credentials/degree">
            <Button variant="outline" size="sm" className="gap-1.5 self-start text-xs font-semibold">
              Explore Degree Hub <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 text-center text-xs font-semibold">
            {["Sem 1", "Sem 2", "Sem 3", "Sem 4", "Sem 5", "Sem 6", "Sem 7", "Sem 8"].map((sem, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-indigo-600 font-bold">{sem}</div>
                <div className="text-[10px] text-slate-500 font-normal mt-0.5">20 Credits</div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-indigo-600" />
                Cryptographic Commitment Root
              </div>
              <p className="text-indigo-800 text-[11px]">
                The final B.Tech Degree certificate anchors all 8 prerequisite semester marksheets into a single
                cryptographic commitment root.
              </p>
            </div>
            <span className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg font-bold shrink-0">
              Recursive Integrity
            </span>
          </div>
        </div>
      </section>

      {/* Security & Privacy Architecture Section */}
      <section className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Enterprise Security & Privacy Architecture
          </h2>
          <p className="text-sm text-slate-500 max-w-lg mx-auto">
            Designed from the ground up for strict regulatory compliance, confidentiality, and tenant isolation.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 w-fit">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Strict Off-Chain Privacy</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Student names, birth dates, transcripts, and internal IDs reside in PostgreSQL. No PII is ever
              broadcast to the blockchain ledger.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 w-fit">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Secure HttpOnly Sessions</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Authentication operates exclusively via HttpOnly, SameSite=Lax session cookies with CSRF defense,
              eliminating token exposure in localStorage.
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 w-fit">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900">Multi-Tenant RBAC</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Organization-scoped access control ensures university administrators and issuers can only view and
              manage records belonging to their institution.
            </p>
          </div>
        </div>
      </section>

      {/* Footer / Ready to Verify Banner */}
      <section className="bg-linear-to-r from-sky-600 to-indigo-600 text-white rounded-3xl p-8 sm:p-10 text-center space-y-4 shadow-lg">
        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
          Ready to verify an academic credential?
        </h2>
        <p className="text-sky-100 text-xs sm:text-sm max-w-md mx-auto">
          Experience instant cryptographic proof verification without login or personal data exposure.
        </p>
        <div className="pt-2">
          <Link href="/verify">
            <Button size="lg" className="bg-white text-slate-900 hover:bg-slate-100 text-xs sm:text-sm font-bold gap-2 px-6 py-3">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Open Verification Portal
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
