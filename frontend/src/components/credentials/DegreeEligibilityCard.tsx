"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Award,
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DegreeEligibilityResult } from "@/types";
import { issueDegree } from "@/lib/api";
import { RelationshipVisualizer } from "./RelationshipVisualizer";

interface DegreeEligibilityCardProps {
  eligibility: DegreeEligibilityResult;
  candidateName: string;
  onDegreeIssued?: (degreeId: string) => void;
}

export function DegreeEligibilityCard({
  eligibility,
  candidateName,
  onDegreeIssued,
}: DegreeEligibilityCardProps) {
  const router = useRouter();
  const [isIssuing, setIsIssuing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getClassificationLabel = (classification: string) => {
    switch (classification) {
      case "FIRST_CLASS_WITH_DISTINCTION":
        return "First Class with Distinction (Honours)";
      case "FIRST_CLASS":
        return "First Class";
      case "SECOND_CLASS":
        return "Second Class";
      default:
        return "Pass Division";
    }
  };

  const handleIssueDegree = async () => {
    if (!eligibility.isEligible) return;
    setIsIssuing(true);
    setError(null);

    try {
      const degree = await issueDegree({
        candidateId: eligibility.candidateId,
        organizationId: eligibility.organizationId,
        programName: eligibility.programName,
        degreeTitle: `Bachelor of Technology in ${eligibility.programName.replace(/^B\.Tech\s+/i, "") || "Computer Science"}`,
      });

      if (onDegreeIssued) {
        onDegreeIssued(degree.id);
      } else {
        router.push(`/credentials/${degree.id}`);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || "Failed to issue degree");
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header Banner */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider">
              <GraduationCap className="w-4 h-4" />
              Academic Degree Evaluation
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {eligibility.programName || "B.Tech Computer Science & Engineering"}
            </h2>
            <p className="text-slate-300 text-sm">
              Candidate: <span className="text-white font-semibold">{candidateName}</span>
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {eligibility.isEligible ? (
              <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Eligible for Degree
              </div>
            ) : (
              <div className="bg-amber-500/20 border border-amber-500/30 text-amber-300 px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {8 - eligibility.passedSemestersCount} Semesters Remaining
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <div className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              Semesters Completed
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {eligibility.completedSemestersCount} <span className="text-sm font-normal text-slate-500">/ 8</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              {eligibility.passedSemestersCount} verified passed
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <div className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              Cumulative GPA
            </div>
            <div className="mt-2 text-2xl font-bold text-indigo-600">
              {eligibility.cumulativeGpa > 0 ? eligibility.cumulativeGpa.toFixed(2) : "N/A"}
              <span className="text-sm font-normal text-slate-500"> / 10.0</span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Credit-weighted average
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <div className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              Total Credits
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {eligibility.totalCreditsEarned}
            </div>
            <div className="mt-1 text-[11px] text-slate-500">
              Across all modules
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4">
            <div className="text-slate-500 text-xs font-medium flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
              Classification
            </div>
            <div className="mt-2 text-sm font-bold text-slate-900 line-clamp-1">
              {getClassificationLabel(eligibility.projectedClassification)}
            </div>
            <div className="mt-1 text-[11px] text-indigo-600 font-semibold">
              {eligibility.projectedClassification.replace(/_/g, " ")}
            </div>
          </div>
        </div>

        {/* 8-Semester Progression DAG Viewer */}
        <div>
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            Academic Progression & On-Chain DAG Chain
          </div>
          <RelationshipVisualizer
            semesters={eligibility.semesters}
            degreeTitle="B.Tech Degree"
            cgpa={eligibility.cumulativeGpa}
            interactive={true}
          />
        </div>

        {/* Ineligibility Warning or Checklist */}
        {!eligibility.isEligible && eligibility.ineligibilityReasons.length > 0 && (
          <div className="bg-amber-50/80 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              Degree Eligibility Requirements Pending
            </div>
            <ul className="mt-2 space-y-1.5 text-xs text-amber-800 list-disc list-inside">
              {eligibility.ineligibilityReasons.map((reason, idx) => (
                <li key={idx}>{reason}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
            {error}
          </div>
        )}

        {/* Action Button */}
        <div className="flex items-center justify-end pt-2">
          {eligibility.isEligible ? (
            <button
              type="button"
              onClick={handleIssueDegree}
              disabled={isIssuing}
              className={cn(
                "inline-flex items-center gap-2 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer",
                isIssuing && "opacity-60 cursor-not-allowed"
              )}
            >
              <GraduationCap className="w-5 h-5" />
              {isIssuing ? "Issuing & Anchoring On-Chain..." : "Issue Official B.Tech Degree"}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              disabled={true}
              className="inline-flex items-center gap-2 bg-slate-100 text-slate-400 font-semibold px-6 py-3 rounded-xl cursor-not-allowed border border-slate-200"
            >
              <GraduationCap className="w-5 h-5" />
              Complete All 8 Semesters to Issue Degree
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
