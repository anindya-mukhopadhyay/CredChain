import { apiClient } from "./client";
import type {
  Organization,
  OrganizationType,
  Candidate,
  Credential,
  CredentialStatus,
  VerificationResult,
  AuditLog,
  DashboardStats,
} from "@/types";

// Organizations
export async function listOrganizations(): Promise<Organization[]> {
  return apiClient<Organization[]>("/api/v1/organizations");
}

export async function createOrganization(input: {
  name: string;
  type: OrganizationType;
}): Promise<Organization> {
  return apiClient<Organization>("/api/v1/organizations", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Candidates
export async function listCandidates(organizationId?: string): Promise<Candidate[]> {
  return apiClient<Candidate[]>("/api/v1/candidates", {
    params: { organizationId },
  });
}

export async function getCandidate(id: string): Promise<Candidate> {
  return apiClient<Candidate>(`/api/v1/candidates/${id}`);
}

export async function createCandidate(input: {
  organizationId: string;
  candidateReference?: string;
  name?: string;
  givenName?: string;
  familyName?: string;
  dateOfBirth?: string;
  metadata?: Record<string, unknown>;
}): Promise<Candidate> {
  return apiClient<Candidate>("/api/v1/candidates", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Credentials
export async function listCredentials(filters: {
  organizationId?: string;
  candidateId?: string;
  status?: CredentialStatus;
} = {}): Promise<Credential[]> {
  return apiClient<Credential[]>("/api/v1/credentials", {
    params: filters,
  });
}

export async function getCredential(id: string): Promise<Credential> {
  return apiClient<Credential>(`/api/v1/credentials/${id}`);
}

export async function createCredential(input: {
  organizationId: string;
  candidateId: string;
  credentialType: string;
  credentialNumber?: string;
  expiryDate?: string | null;
  payload: Record<string, unknown>;
}): Promise<Credential> {
  return apiClient<Credential>("/api/v1/credentials", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateDraftPayload(
  id: string,
  payload: Record<string, unknown>
): Promise<Credential> {
  return apiClient<Credential>(`/api/v1/credentials/${id}/payload`, {
    method: "PATCH",
    body: JSON.stringify({ payload }),
  });
}

export async function finalizeCredential(id: string): Promise<Credential> {
  return apiClient<Credential>(`/api/v1/credentials/${id}/finalize`, {
    method: "POST",
  });
}

export async function verifyCredential(id: string): Promise<VerificationResult> {
  return apiClient<VerificationResult>(`/api/v1/credentials/${id}/verify`);
}

export async function revokeCredential(
  id: string,
  input: { reasonCode: string; note?: string }
): Promise<Credential> {
  return apiClient<Credential>(`/api/v1/credentials/${id}/revoke`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Academic Degree & Chain Management
export async function getDegreeEligibility(
  candidateId: string
): Promise<import("@/types").DegreeEligibilityResult> {
  return apiClient<import("@/types").DegreeEligibilityResult>(
    `/api/v1/candidates/${candidateId}/degree-eligibility`
  );
}

export async function issueDegree(input: {
  candidateId: string;
  organizationId: string;
  programName?: string;
  degreeTitle?: string;
  graduationDate?: string;
}): Promise<Credential> {
  return apiClient<Credential>("/api/v1/credentials/degree", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getCredentialRelationships(
  credentialId: string
): Promise<import("@/types").CredentialRelationship[]> {
  return apiClient<import("@/types").CredentialRelationship[]>(
    `/api/v1/credentials/${credentialId}/relationships`
  );
}

// Dashboard Stats & Audits
export async function getDashboardStats(organizationId?: string): Promise<DashboardStats> {
  return apiClient<DashboardStats>("/api/v1/dashboard/stats", {
    params: { organizationId },
  });
}

export async function listAuditLogs(filters: {
  organizationId?: string;
  credentialId?: string;
  candidateId?: string;
} = {}): Promise<AuditLog[]> {
  return apiClient<AuditLog[]>("/api/v1/audit-logs", {
    params: filters,
  });
}
