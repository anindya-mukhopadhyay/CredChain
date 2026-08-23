"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createCredential, listOrganizations, listCandidates } from "@/lib/api";
import type { Organization, Candidate, SubjectItem } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Spinner } from "@/components/ui/Spinner";
import { ArrowLeft, Plus, Trash2, Award, Calculator, AlertCircle } from "lucide-react";

function NewCredentialContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preSelectedOrgId = searchParams.get("organizationId");
  const preSelectedCandId = searchParams.get("candidateId");

  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [organizationId, setOrganizationId] = useState(preSelectedOrgId || "");
  const [candidateId, setCandidateId] = useState(preSelectedCandId || "");
  const credentialType = "BTECH_SEMESTER_MARKSHEET";
  const [program, setProgram] = useState("B.Tech Computer Science & Engineering");
  const [semester, setSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [result, setResult] = useState<"PASS" | "FAIL" | "WITHHELD">("PASS");

  // Dynamic Subjects
  const [subjects, setSubjects] = useState<SubjectItem[]>([
    { subjectCode: "CS101", subjectName: "Data Structures & Algorithms", credits: 4, grade: "A", marks: 88 },
    { subjectCode: "CS102", subjectName: "Computer Architecture", credits: 4, grade: "B", marks: 78 },
    { subjectCode: "MA101", subjectName: "Discrete Mathematics", credits: 3, grade: "A", marks: 85 },
  ]);

  useEffect(() => {
    async function loadMetadata() {
      try {
        setIsLoading(true);
        const orgs = await listOrganizations();
        setOrganizations(orgs);
        const defaultOrg = preSelectedOrgId || (orgs.length > 0 ? orgs[0].id : "");
        setOrganizationId(defaultOrg);

        if (defaultOrg) {
          const cands = await listCandidates(defaultOrg);
          setCandidates(cands);
          if (preSelectedCandId && cands.some((c) => c.id === preSelectedCandId)) {
            setCandidateId(preSelectedCandId);
          } else if (cands.length > 0) {
            setCandidateId(cands[0].id);
          }
        }
      } catch {
        setError("Failed to load organizations or candidates");
      } finally {
        setIsLoading(false);
      }
    }
    loadMetadata();
  }, [preSelectedOrgId, preSelectedCandId]);

  const handleOrgChange = async (orgId: string) => {
    setOrganizationId(orgId);
    setCandidateId("");
    try {
      const cands = await listCandidates(orgId);
      setCandidates(cands);
      if (cands.length > 0) {
        setCandidateId(cands[0].id);
      }
    } catch {
      setCandidates([]);
    }
  };

  const handleAddSubject = () => {
    setSubjects([
      ...subjects,
      { subjectCode: "", subjectName: "", credits: 3, grade: "A", marks: 80 },
    ]);
  };

  const handleRemoveSubject = (index: number) => {
    if (subjects.length <= 1) return;
    setSubjects(subjects.filter((_, i) => i !== index));
  };

  const handleSubjectChange = <K extends keyof SubjectItem>(
    index: number,
    field: K,
    value: SubjectItem[K]
  ) => {
    const updated = [...subjects];
    updated[index] = { ...updated[index], [field]: value };
    setSubjects(updated);
  };

  // Calculate live GPA
  const gradePoints: Record<string, number> = {
    O: 10,
    "A+": 10,
    A: 9,
    "B+": 8,
    B: 7,
    "C+": 6,
    C: 5,
    D: 4,
    F: 0,
  };

  let totalCredits = 0;
  let weightedPoints = 0;
  for (const sub of subjects) {
    const pts = gradePoints[sub.grade.toUpperCase()] ?? 0;
    totalCredits += Number(sub.credits) || 0;
    weightedPoints += pts * (Number(sub.credits) || 0);
  }
  const computedGpa = totalCredits > 0 ? (weightedPoints / totalCredits).toFixed(2) : "0.00";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      setError("Please select an issuing organization.");
      return;
    }
    if (!candidateId) {
      setError("Please select a candidate recipient.");
      return;
    }
    if (subjects.length === 0) {
      setError("Please add at least one subject.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const payload = {
        semester: Number(semester),
        academicYear,
        program,
        result,
        semesterGpa: Number(computedGpa),
        subjects: subjects.map((s) => ({
          subjectCode: s.subjectCode.trim(),
          subjectName: s.subjectName.trim(),
          credits: Number(s.credits) || 0,
          grade: s.grade.trim().toUpperCase(),
          marks: s.marks ? Number(s.marks) : undefined,
        })),
      };

      const created = await createCredential({
        organizationId,
        candidateId,
        credentialType,
        payload,
      });

      router.push(`/credentials/${created.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create draft credential";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/credentials">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Issue Marksheet</h2>
          <p className="text-sm text-slate-500">
            Create a semester marksheet record in DRAFT status before cryptographic finalization.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Metadata Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5 text-sky-600" />
              <CardTitle className="text-base">Credential Context & Recipient</CardTitle>
            </div>
            <CardDescription>Select the issuing organization and candidate student</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Issuing Organization"
                value={organizationId}
                onChange={(e) => handleOrgChange(e.target.value)}
                disabled={isLoading || organizations.length === 0}
                required
              >
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name} ({org.organizationType})
                  </option>
                ))}
              </Select>

              <Select
                label="Candidate Student"
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                disabled={isLoading || candidates.length === 0}
                required
                helperText={
                  candidates.length === 0
                    ? "No candidates found for this organization. Create a candidate first."
                    : undefined
                }
              >
                {candidates.map((cand) => (
                  <option key={cand.id} value={cand.id}>
                    {cand.givenName} {cand.familyName} ({cand.externalReference || "No Ref"})
                  </option>
                ))}
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Academic Program"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="e.g. B.Tech Computer Science"
                required
              />

              <Select
                label="Semester"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value))}
                options={[
                  { value: "1", label: "Semester 1" },
                  { value: "2", label: "Semester 2" },
                  { value: "3", label: "Semester 3" },
                  { value: "4", label: "Semester 4" },
                  { value: "5", label: "Semester 5" },
                  { value: "6", label: "Semester 6" },
                  { value: "7", label: "Semester 7" },
                  { value: "8", label: "Semester 8" },
                ]}
                required
              />

              <Input
                label="Academic Session / Year"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="e.g. 2024-2025"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Subjects Card */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Subject Grades & Results</CardTitle>
              <CardDescription>Add all registered course modules and grades</CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSubject}
              className="text-xs gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Add Subject
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase">
                  <tr>
                    <th className="px-3 py-2.5">Code</th>
                    <th className="px-3 py-2.5">Subject Name</th>
                    <th className="px-3 py-2.5 w-20">Credits</th>
                    <th className="px-3 py-2.5 w-24">Grade</th>
                    <th className="px-3 py-2.5 w-20">Marks</th>
                    <th className="px-3 py-2.5 text-right w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {subjects.map((sub, index) => (
                    <tr key={index}>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={sub.subjectCode}
                          onChange={(e) =>
                            handleSubjectChange(index, "subjectCode", e.target.value)
                          }
                          placeholder="CS101"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded font-mono text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={sub.subjectName}
                          onChange={(e) =>
                            handleSubjectChange(index, "subjectName", e.target.value)
                          }
                          placeholder="Subject title"
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="1"
                          max="10"
                          value={sub.credits}
                          onChange={(e) =>
                            handleSubjectChange(index, "credits", Number(e.target.value))
                          }
                          className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-mono"
                          required
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={sub.grade}
                          onChange={(e) =>
                            handleSubjectChange(index, "grade", e.target.value)
                          }
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-semibold"
                        >
                          <option value="O">O (10)</option>
                          <option value="A+">A+ (10)</option>
                          <option value="A">A (9)</option>
                          <option value="B+">B+ (8)</option>
                          <option value="B">B (7)</option>
                          <option value="C+">C+ (6)</option>
                          <option value="C">C (5)</option>
                          <option value="D">D (4)</option>
                          <option value="F">F (0)</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={sub.marks ?? ""}
                          onChange={(e) =>
                            handleSubjectChange(index, "marks", e.target.value ? Number(e.target.value) : undefined)
                          }
                          placeholder="—"
                          className="w-full px-2 py-1.5 bg-white border border-slate-200 rounded text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 font-mono"
                        />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveSubject(index)}
                          disabled={subjects.length <= 1}
                          className="text-slate-400 hover:text-rose-600 disabled:opacity-30 transition-colors p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* GPA Summary and Overall Result */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-indigo-600" />
                  <div>
                    <span className="text-xs text-slate-500 block">Computed Semester GPA</span>
                    <span className="text-lg font-bold text-slate-900">{computedGpa} / 10.0</span>
                  </div>
                </div>
                <div className="border-l border-slate-200 pl-6">
                  <span className="text-xs text-slate-500 block">Total Credits</span>
                  <span className="text-base font-semibold text-slate-800">{totalCredits} Credits</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Overall Result:</span>
                <select
                  value={result}
                  onChange={(e) => setResult(e.target.value as "PASS" | "FAIL" | "WITHHELD")}
                  className="py-1 px-3 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:ring-1 focus:ring-sky-500"
                >
                  <option value="PASS">PASS</option>
                  <option value="FAIL">FAIL</option>
                  <option value="WITHHELD">WITHHELD</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-3">
          <Link href="/credentials">
            <Button type="button" variant="outline" disabled={isSubmitting}>
              Cancel
            </Button>
          </Link>
          <Button type="submit" isLoading={isSubmitting} disabled={isLoading || candidates.length === 0}>
            Save as Draft Credential
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewCredentialPage() {
  return (
    <Suspense
      fallback={
        <div className="h-96 flex flex-col items-center justify-center gap-3 text-slate-400">
          <Spinner size="lg" className="text-sky-600" />
          <p className="text-sm font-medium">Loading marksheet form...</p>
        </div>
      }
    >
      <NewCredentialContent />
    </Suspense>
  );
}
