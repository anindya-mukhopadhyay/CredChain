"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  GraduationCap,
  ArrowLeft,
  Building2,
  Loader2,
} from "lucide-react";
import { listOrganizations, listCandidates, getDegreeEligibility } from "@/lib/api";
import type { Organization, Candidate, DegreeEligibilityResult } from "@/types";
import { DegreeEligibilityCard } from "@/components/credentials/DegreeEligibilityCard";

export default function IssueDegreePage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [selectedCandId, setSelectedCandId] = useState<string>("");
  const [eligibility, setEligibility] = useState<DegreeEligibilityResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        const orgs = await listOrganizations();
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setSelectedOrgId(orgs[0].id);
        }
      } catch (err) {
        console.error("Failed to load organizations", err);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function loadCands() {
      if (!selectedOrgId) return;
      try {
        const cands = await listCandidates(selectedOrgId);
        setCandidates(cands);
        if (cands.length > 0) {
          setSelectedCandId(cands[0].id);
        } else {
          setSelectedCandId("");
          setEligibility(null);
        }
      } catch (err) {
        console.error("Failed to load candidates", err);
      }
    }
    loadCands();
  }, [selectedOrgId]);

  useEffect(() => {
    async function checkElig() {
      if (!selectedCandId) {
        setEligibility(null);
        return;
      }
      setEvaluating(true);
      try {
        const result = await getDegreeEligibility(selectedCandId);
        setEligibility(result);
      } catch (err) {
        console.error("Failed to check degree eligibility", err);
        setEligibility(null);
      } finally {
        setEvaluating(false);
      }
    }
    checkElig();
  }, [selectedCandId]);

  const selectedCandidate = candidates.find((c) => c.id === selectedCandId);
  const candidateFullName = selectedCandidate
    ? `${selectedCandidate.givenName} ${selectedCandidate.familyName}`
    : "Candidate";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/credentials"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Credentials
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Academic Degree Program Hub
              </h1>
              <p className="text-slate-500 text-xs mt-0.5">
                8-Semester Progression Evaluation & Merkle-Anchored B.Tech Degree Issuance
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Candidate Selection Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-600" />
          Select Organization & Student Candidate
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Issuing Organization / University
            </label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.organizationType})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Candidate Student
            </label>
            <select
              value={selectedCandId}
              onChange={(e) => setSelectedCandId(e.target.value)}
              disabled={candidates.length === 0}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {candidates.length === 0 ? (
                <option value="">No candidates found in this organization</option>
              ) : (
                candidates.map((cand) => (
                  <option key={cand.id} value={cand.id}>
                    {cand.givenName} {cand.familyName}{" "}
                    {cand.externalReference ? `(${cand.externalReference})` : ""}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Degree Evaluation Section */}
      {evaluating ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mx-auto" />
          <div className="font-bold text-slate-900 text-sm">
            Evaluating 8-Semester Academic Chain & CGPA...
          </div>
          <div className="text-xs text-slate-500">
            Checking marksheet completion, passing grades, integrity proofs, and prerequisite relationships.
          </div>
        </div>
      ) : eligibility ? (
        <DegreeEligibilityCard
          eligibility={eligibility}
          candidateName={candidateFullName}
        />
      ) : selectedCandId ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500 text-sm">
          No academic marksheet records found for this candidate.
        </div>
      ) : null}
    </div>
  );
}
