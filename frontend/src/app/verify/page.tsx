"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Search, Lock, Database, ArrowRight } from "lucide-react";

export default function VerifyPortalPage() {
  const [credentialId, setCredentialId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = credentialId.trim();
    if (!cleanId) {
      setError("Please enter a valid Credential ID or UUID");
      return;
    }
    router.push(`/verify/${encodeURIComponent(cleanId)}`);
  };

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      {/* Hero Header */}
      <div className="text-center space-y-3">
        <div className="inline-flex p-3 rounded-2xl bg-sky-100/70 text-sky-700 shadow-2xs">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-900">
          Public Credential Verification
        </h2>
        <p className="text-sm text-slate-500 max-w-lg mx-auto">
          Verify the authenticity and tamper-evident cryptographic proof of any academic marksheet or
          professional certificate registered on CredChain.
        </p>
      </div>

      {/* Verification Input Box */}
      <Card className="shadow-lg border-slate-200">
        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label htmlFor="credential-id" className="block text-sm font-semibold text-slate-800 mb-2">
                Enter Credential ID
              </label>
              <div className="relative">
                <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <input
                  id="credential-id"
                  type="text"
                  placeholder="e.g. e1216dc9-52b9-4fa8-91bc-ce1ef9c76e8e"
                  value={credentialId}
                  onChange={(e) => {
                    setCredentialId(e.target.value);
                    if (error) setError(null);
                  }}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-rose-600 font-medium mt-1.5">{error}</p>}
            </div>

            <Button type="submit" size="lg" className="w-full text-base font-semibold gap-2 py-3">
              Verify Credential Proof <ArrowRight className="w-4 h-4" />
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* How it works grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 w-fit">
            <Lock className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-xs text-slate-900">Deterministic Hashing</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Data fields are normalized and hashed using SHA-256 to ensure complete integrity.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="p-2 rounded-lg bg-sky-50 text-sky-600 w-fit">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-xs text-slate-900">On-Chain Smart Contract</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Proofs are anchored to the CredentialRegistry smart contract for public verification.
          </p>
        </div>

        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs space-y-2">
          <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 w-fit">
            <Database className="w-4 h-4" />
          </div>
          <h4 className="font-semibold text-xs text-slate-900">Off-Chain Privacy</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Sensitive personal data and raw marks remain securely stored off-chain.
          </p>
        </div>
      </div>
    </div>
  );
}
