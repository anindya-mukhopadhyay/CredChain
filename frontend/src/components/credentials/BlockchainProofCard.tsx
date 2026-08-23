"use client";

import React, { useState } from "react";
import type { Credential } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Shield, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";

interface BlockchainProofCardProps {
  credential: Credential;
}

export function BlockchainProofCard({ credential }: BlockchainProofCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isAnchored = credential.status === "ISSUED" || credential.status === "REVOKED";

  return (
    <Card className="border-sky-100 bg-linear-to-b from-sky-50/30 to-white">
      <CardHeader className="py-4 cursor-pointer select-none" onClick={() => setIsOpen(!isOpen)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-100/80 text-sky-700">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base">Blockchain Proof & Integrity</CardTitle>
              <p className="text-xs text-slate-500">
                {isAnchored
                  ? "Cryptographic proof anchored to CredentialRegistry smart contract"
                  : "Proof will be minted on-chain upon finalization"}
              </p>
            </div>
          </div>
          <button className="text-slate-400 hover:text-slate-700 p-1">
            {isOpen ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </CardHeader>

      {isOpen && (
        <CardContent className="pt-2 pb-5 border-t border-slate-100 space-y-3.5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="font-medium text-slate-500 block mb-1">Network</span>
              <span className="font-semibold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Hardhat Localhost (Chain ID: 31337)
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60">
              <span className="font-medium text-slate-500 block mb-1">Registry Contract</span>
              <span className="font-mono text-slate-900 flex items-center justify-between">
                <span>0x5FbDB2315678afecb367f032d93F642f64180aa3</span>
              </span>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 md:col-span-2">
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-500">Canonical SHA-256 Hash</span>
                {credential.canonicalHash && (
                  <button
                    onClick={() => copyToClipboard("hash", credential.canonicalHash!)}
                    className="text-sky-600 hover:text-sky-800 flex items-center gap-1 text-[11px]"
                  >
                    {copiedKey === "hash" ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" /> Copy
                      </>
                    )}
                  </button>
                )}
              </div>
              <span className="font-mono text-slate-900 break-all text-[11px] block bg-white p-2 rounded border border-slate-200/60">
                {credential.canonicalHash || "Hash not generated yet (Credential in DRAFT)"}
              </span>
            </div>

            {credential.blockchainTxId && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/60 md:col-span-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-slate-500">Blockchain Transaction</span>
                </div>
                <span className="font-mono text-slate-900 break-all text-[11px] block bg-white p-2 rounded border border-slate-200/60">
                  {credential.blockchainTxId}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  );
}
