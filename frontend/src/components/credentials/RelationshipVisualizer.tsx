"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  AlertCircle,
  Clock,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { SemesterEligibilityCheck, CredentialRelationship } from "@/types";

interface RelationshipVisualizerProps {
  currentSemester?: number;
  semesters?: SemesterEligibilityCheck[];
  relationships?: CredentialRelationship[];
  degreeCredentialId?: string;
  degreeStatus?: string;
  degreeTitle?: string;
  cgpa?: number;
  interactive?: boolean;
}

export function RelationshipVisualizer({
  currentSemester,
  semesters = [],
  degreeCredentialId,
  degreeStatus,
  degreeTitle = "B.Tech Degree",
  cgpa,
  interactive = true,
}: RelationshipVisualizerProps) {
  const [selectedSem, setSelectedSem] = useState<number | "DEGREE" | null>(null);

  const semNumbers = [1, 2, 3, 4, 5, 6, 7, 8];

  // Map semester check info by number if available
  const semMap = new Map<number, SemesterEligibilityCheck>();
  semesters.forEach((s) => semMap.set(s.semesterNumber, s));

  const allSemestersPassed =
    semesters.length === 8 && semesters.every((s) => s.isPassed && !s.isRevoked);

  const selectedSemData = typeof selectedSem === "number" ? semMap.get(selectedSem) : null;

  return (
    <div className="w-full space-y-4">
      <div className="overflow-x-auto pb-3 pt-1">
        <div className="flex items-center min-w-max gap-2.5">
          {semNumbers.map((sem, idx) => {
            const semData = semMap.get(sem);
            const isCompleted = semData?.isCompleted ?? (currentSemester ? sem < currentSemester : false);
            const isPassed = semData?.isPassed ?? isCompleted;
            const isCurrent = currentSemester ? sem === currentSemester : false;
            const isRevoked = semData?.isRevoked ?? false;
            const isSelected = selectedSem === sem;

            return (
              <React.Fragment key={sem}>
                <button
                  type="button"
                  onClick={() => interactive && setSelectedSem(isSelected ? null : sem)}
                  className={cn(
                    "flex items-center gap-2 px-3.5 py-2.5 rounded-xl border text-xs font-semibold select-none transition-all shadow-xs text-left",
                    isSelected && "ring-2 ring-indigo-500 shadow-md scale-105",
                    isRevoked
                      ? "bg-rose-50 border-rose-300 text-rose-800"
                      : isPassed && isCompleted
                      ? "bg-emerald-50/90 border-emerald-300 text-emerald-900 hover:bg-emerald-100"
                      : isCurrent
                      ? "bg-sky-50 border-sky-400 text-sky-900 ring-2 ring-sky-500/20"
                      : semData && !semData.isPassed
                      ? "bg-amber-50 border-amber-300 text-amber-900"
                      : "bg-slate-50 border-slate-200 text-slate-400 opacity-60 hover:opacity-100"
                  )}
                >
                  {isRevoked ? (
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  ) : isPassed && isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : isCurrent ? (
                    <Clock className="w-4 h-4 text-sky-600 shrink-0" />
                  ) : (
                    <span
                      className={cn(
                        "w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold",
                        semData ? "bg-amber-200 text-amber-800" : "bg-slate-200 text-slate-600"
                      )}
                    >
                      {sem}
                    </span>
                  )}
                  <div>
                    <div className="font-bold">Sem {sem}</div>
                    {semData?.semesterGpa ? (
                      <div className="text-[10px] opacity-80">{semData.semesterGpa.toFixed(2)} SGPA</div>
                    ) : null}
                  </div>
                </button>

                {idx < semNumbers.length - 1 && (
                  <ArrowRight
                    className={cn(
                      "w-3.5 h-3.5 shrink-0",
                      isPassed && isCompleted ? "text-emerald-500" : "text-slate-300"
                    )}
                  />
                )}
              </React.Fragment>
            );
          })}

          {/* Terminal Degree Node */}
          <ArrowRight
            className={cn(
              "w-4 h-4 shrink-0 font-bold",
              allSemestersPassed || degreeCredentialId ? "text-indigo-500" : "text-slate-300"
            )}
          />

          <button
            type="button"
            onClick={() => interactive && setSelectedSem(selectedSem === "DEGREE" ? null : "DEGREE")}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-xs font-bold select-none transition-all shadow-xs text-left",
              selectedSem === "DEGREE" && "ring-2 ring-indigo-500 shadow-md scale-105",
              degreeCredentialId
                ? "bg-linear-to-r from-indigo-50 to-purple-50 border-indigo-300 text-indigo-950 hover:from-indigo-100 hover:to-purple-100"
                : allSemestersPassed
                ? "bg-emerald-50 border-emerald-400 text-emerald-950 border-dashed"
                : "bg-slate-50 border-slate-200 text-slate-400 opacity-60"
            )}
          >
            <div
              className={cn(
                "p-1 rounded-lg",
                degreeCredentialId
                  ? "bg-indigo-600 text-white"
                  : allSemestersPassed
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-200 text-slate-500"
              )}
            >
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <div className="font-extrabold flex items-center gap-1.5">
                <span>{degreeTitle}</span>
                {degreeCredentialId && <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />}
              </div>
              <div className="text-[10px] font-normal opacity-85">
                {degreeCredentialId
                  ? `${degreeStatus || "ISSUED"} • ${cgpa ? `${cgpa.toFixed(2)} CGPA` : "Verified"}`
                  : allSemestersPassed
                  ? "Ready for Issuance"
                  : "Prerequisites Required"}
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Selected Node Details Drawer */}
      {interactive && selectedSem && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs animate-in fade-in-50 duration-200">
          {selectedSem === "DEGREE" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  {degreeTitle} Root Credential
                </div>
                {degreeCredentialId && (
                  <Link
                    href={`/credentials/${degreeCredentialId}`}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                  >
                    View Degree Certificate <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <p className="text-slate-600 leading-relaxed">
                The B.Tech Degree acts as the cryptographic Merkle root anchoring all 8 underlying
                semester marksheets through immutable on-chain <code className="bg-slate-200 px-1 py-0.5 rounded text-[11px]">DERIVED_FROM</code> relationships.
              </p>
              {cgpa && (
                <div className="inline-flex items-center gap-2 bg-indigo-100/80 text-indigo-900 px-2.5 py-1 rounded-md font-semibold text-xs">
                  Overall CGPA: {cgpa.toFixed(2)} / 10.0
                </div>
              )}
            </div>
          ) : selectedSemData ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="font-bold text-slate-900 text-sm">
                  Semester {selectedSemData.semesterNumber} Marksheet Details
                </div>
                {selectedSemData.credentialId && (
                  <Link
                    href={`/credentials/${selectedSemData.credentialId}`}
                    className="text-indigo-600 hover:text-indigo-700 font-semibold flex items-center gap-1"
                  >
                    View Marksheet #{selectedSemData.credentialNumber} <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Status</div>
                  <div className="font-bold text-slate-900">{selectedSemData.status || "N/A"}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Result</div>
                  <div className={cn("font-bold", selectedSemData.isPassed ? "text-emerald-700" : "text-rose-700")}>
                    {selectedSemData.resultStatus || "Pending"}
                  </div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Semester GPA</div>
                  <div className="font-bold text-slate-900">{selectedSemData.semesterGpa?.toFixed(2) || "N/A"}</div>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <div className="text-slate-500 text-[10px]">Credits Earned</div>
                  <div className="font-bold text-slate-900">{selectedSemData.credits || 0}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-slate-500">
              Semester {selectedSem} marksheet is pending registration by the university.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
