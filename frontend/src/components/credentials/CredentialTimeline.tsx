import React from "react";
import type { Credential } from "@/types";
import { formatDateTime } from "@/lib/utils";
import { Check, Clock, AlertTriangle, ShieldCheck, Database, Link as LinkIcon } from "lucide-react";

interface CredentialTimelineProps {
  credential: Credential;
}

export function CredentialTimeline({ credential }: CredentialTimelineProps) {
  const isRevoked = credential.status === "REVOKED";
  const isFinalized = credential.status === "FINALIZED" || credential.status === "ISSUED" || isRevoked;
  const isIssued = credential.status === "ISSUED" || isRevoked;

  const steps = [
    {
      title: "Draft Created",
      description: "Initial credential payload structured in PostgreSQL",
      date: credential.createdAt,
      icon: <Database className="w-4 h-4" />,
      completed: true,
    },
    {
      title: "Canonical Hash Generated",
      description: credential.canonicalHash
        ? `SHA-256: ${credential.canonicalHash.slice(0, 16)}...`
        : "Pending finalization",
      date: credential.finalizedAt,
      icon: <LinkIcon className="w-4 h-4" />,
      completed: isFinalized,
    },
    {
      title: "Blockchain Proof Registered",
      description: credential.blockchainTxId
        ? "Smart contract verified & anchored to CredentialRegistry"
        : isFinalized
        ? "Pending blockchain transaction confirmation"
        : "Awaiting finalization",
      date: isIssued ? credential.updatedAt : null,
      icon: <ShieldCheck className="w-4 h-4" />,
      completed: isIssued,
    },
  ];

  if (isRevoked) {
    steps.push({
      title: "Credential Revoked",
      description: "Revocation recorded on-chain and marked inactive in registry",
      date: credential.updatedAt,
      icon: <AlertTriangle className="w-4 h-4 text-rose-500" />,
      completed: true,
    });
  }

  return (
    <div className="flow-root">
      <ul className="-mb-8">
        {steps.map((step, stepIdx) => (
          <li key={step.title}>
            <div className="relative pb-8">
              {stepIdx !== steps.length - 1 ? (
                <span
                  className={`absolute top-4 left-4 -ml-px h-full w-0.5 ${
                    step.completed ? "bg-emerald-500" : "bg-slate-200"
                  }`}
                  aria-hidden="true"
                />
              ) : null}
              <div className="relative flex items-start space-x-3">
                <div>
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${
                      step.completed
                        ? isRevoked && stepIdx === steps.length - 1
                          ? "bg-rose-100 text-rose-600 border border-rose-200"
                          : "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-400 border border-slate-200"
                    }`}
                  >
                    {step.completed ? (
                      isRevoked && stepIdx === steps.length - 1 ? (
                        <AlertTriangle className="w-4 h-4" />
                      ) : (
                        <Check className="w-4 h-4 stroke-[2.5]" />
                      )
                    ) : (
                      <Clock className="w-4 h-4" />
                    )}
                  </div>
                </div>
                <div className="min-w-0 flex-1 pt-1.5 flex justify-between space-x-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{step.description}</p>
                  </div>
                  <div className="text-right text-xs whitespace-nowrap text-slate-400">
                    {formatDateTime(step.date)}
                  </div>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
