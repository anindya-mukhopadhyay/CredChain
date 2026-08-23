"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createCandidate, listOrganizations } from "@/lib/api";
import type { Organization } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AlertCircle, ArrowLeft, UserPlus } from "lucide-react";

export default function NewCandidatePage() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [organizationId, setOrganizationId] = useState("");
  const [candidateReference, setCandidateReference] = useState("");
  const [givenName, setGivenName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  useEffect(() => {
    async function loadOrgs() {
      try {
        const orgs = await listOrganizations();
        setOrganizations(orgs);
        if (orgs.length > 0) {
          setOrganizationId(orgs[0].id);
        }
      } catch {
        setError("Failed to load organizations. Please make sure an organization is registered first.");
      } finally {
        setIsLoadingOrgs(false);
      }
    }
    loadOrgs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!organizationId) {
      setError("Please select an issuing organization.");
      return;
    }
    if (!givenName.trim()) {
      setError("Given name is required.");
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      const created = await createCandidate({
        organizationId,
        candidateReference: candidateReference.trim() || undefined,
        givenName: givenName.trim(),
        familyName: familyName.trim() || "-",
        dateOfBirth: dateOfBirth || undefined,
      });

      router.push(`/candidates/${created.id}`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create candidate";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/candidates">
          <Button variant="ghost" size="sm" className="p-2">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">New Candidate</h2>
          <p className="text-sm text-slate-500">
            Register a student or employee profile within an issuing organization.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-sky-600" />
            <CardTitle>Candidate Profile Details</CardTitle>
          </div>
          <CardDescription>
            All personal information is stored off-chain in PostgreSQL and never exposed on the public ledger.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Select
              label="Issuing Organization"
              value={organizationId}
              onChange={(e) => setOrganizationId(e.target.value)}
              disabled={isLoadingOrgs || organizations.length === 0}
              required
              helperText={
                organizations.length === 0
                  ? "No organizations found. Please create an organization first."
                  : undefined
              }
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name} ({org.organizationType})
                </option>
              ))}
            </Select>

            <Input
              label="Candidate Reference / Roll Number"
              placeholder="e.g. 2024-BTECH-CS-042 or EMP-1092"
              value={candidateReference}
              onChange={(e) => setCandidateReference(e.target.value)}
              helperText="Unique identifier within the organization"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Given Name / First Name"
                placeholder="e.g. Anindya"
                value={givenName}
                onChange={(e) => setGivenName(e.target.value)}
                required
              />

              <Input
                label="Family Name / Surname"
                placeholder="e.g. Mukhopadhyay"
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
              />
            </div>

            <Input
              label="Date of Birth"
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
            />

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Link href="/candidates">
                <Button type="button" variant="outline" disabled={isSubmitting}>
                  Cancel
                </Button>
              </Link>
              <Button type="submit" isLoading={isSubmitting} disabled={isLoadingOrgs || organizations.length === 0}>
                Create Candidate Record
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
