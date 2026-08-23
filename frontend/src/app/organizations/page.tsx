"use client";

import React, { useEffect, useState } from "react";
import { listOrganizations, createOrganization } from "@/lib/api";
import type { Organization, OrganizationType } from "@/types";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";
import { formatDate } from "@/lib/utils";
import { Building2, Plus, CheckCircle2, ShieldAlert } from "lucide-react";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState("");
  const [type, setType] = useState<OrganizationType>("UNIVERSITY");

  const loadOrganizations = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await listOrganizations();
      setOrganizations(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load organizations";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError("Organization name is required");
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError(null);
      await createOrganization({ name: name.trim(), type });
      setName("");
      setType("UNIVERSITY");
      setIsModalOpen(false);
      await loadOrganizations();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create organization";
      setFormError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const orgTypes: { value: OrganizationType; label: string }[] = [
    { value: "UNIVERSITY", label: "University" },
    { value: "COLLEGE", label: "College" },
    { value: "COMPANY", label: "Company / Corporate" },
    { value: "CERTIFICATION_PROVIDER", label: "Certification Provider" },
    { value: "TRAINING_INSTITUTE", label: "Training Institute" },
    { value: "OTHER", label: "Other" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Organizations</h2>
          <p className="text-sm text-slate-500 mt-1">
            Registered educational institutions, testing bodies, and corporate issuers.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-1.5 self-start">
          <Plus className="w-4 h-4" />
          Add Organization
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-sm rounded-xl">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-sky-600" />
            <CardTitle>Issuing Organizations</CardTitle>
          </div>
          <CardDescription>Verified entities authorized to register credential proofs</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center gap-2 text-slate-400">
              <Spinner size="md" className="text-sky-600" />
              <span className="text-xs font-medium">Loading organizations...</span>
            </div>
          ) : organizations.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              No organizations found. Click &quot;Add Organization&quot; to create your first issuer.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-100 text-slate-500 uppercase font-semibold">
                <tr>
                  <th className="px-6 py-3">Organization Name</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Organization ID</th>
                  <th className="px-6 py-3">Created</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-semibold text-slate-900">{org.name}</td>
                    <td className="px-6 py-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-medium">
                        {org.organizationType.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {org.verificationStatus === "VERIFIED" ? (
                        <Badge variant="success" size="sm">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          VERIFIED
                        </Badge>
                      ) : (
                        <Badge variant="warning" size="sm">
                          {org.verificationStatus}
                        </Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-500 text-[11px]">{org.id}</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(org.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {/* Creation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Issuing Organization"
        description="Register an educational institution or company to issue credentials."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <Input
            label="Organization Name"
            placeholder="e.g. Stanford University / Tech Corp"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />

          <Select
            label="Organization Type"
            value={type}
            onChange={(e) => setType(e.target.value as OrganizationType)}
            options={orgTypes}
            required
          />

          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Register Organization
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
