export type OrganizationType =
  | "UNIVERSITY"
  | "COLLEGE"
  | "COMPANY"
  | "CERTIFICATION_PROVIDER"
  | "TRAINING_INSTITUTE"
  | "OTHER";

export type OrganizationVerificationStatus = "PENDING" | "VERIFIED" | "SUSPENDED";

export type Organization = {
  id: string;
  name: string;
  organizationType: OrganizationType;
  verificationStatus: OrganizationVerificationStatus;
  createdAt: string;
  updatedAt: string;
};

export type Candidate = {
  id: string;
  organizationId: string;
  externalReference: string | null;
  givenName: string;
  familyName: string;
  dateOfBirth: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type CredentialStatus = "DRAFT" | "FINALIZED" | "ISSUED" | "REVOKED";

export type SubjectItem = {
  subjectCode: string;
  subjectName: string;
  credits: number;
  grade: string;
  marks?: number;
};

export type SemesterPayload = {
  semester: number;
  academicYear?: string;
  program?: string;
  subjects: SubjectItem[];
  result: "PASS" | "FAIL" | "WITHHELD";
  semesterGpa?: number;
  overallGpa?: number;
  [key: string]: unknown;
};

export type Credential = {
  id: string;
  credentialNumber: string;
  credentialType: string;
  candidateId: string;
  organizationId: string;
  issuerUserId: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  status: CredentialStatus;
  canonicalHash: string | null;
  documentUri: string | null;
  verificationUrl: string | null;
  blockchainTxId: string | null;
  credentialPayload: Record<string, unknown>;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type VerificationStatus =
  | "VERIFIED"
  | "TAMPERED"
  | "REVOKED"
  | "NOT_FOUND"
  | "INVALID"
  | "PENDING_BLOCKCHAIN";

export type VerificationResult = {
  status: VerificationStatus;
  dbHash?: string | null;
  computedHash?: string;
  blockchainHash?: string;
  hashMismatch?: boolean;
};

export type AuditEventType =
  | "ORGANIZATION_CREATED"
  | "CANDIDATE_CREATED"
  | "CREDENTIAL_CREATED"
  | "CREDENTIAL_FINALIZED"
  | "CREDENTIAL_VERIFIED"
  | "CREDENTIAL_TAMPER_DETECTED"
  | "CREDENTIAL_REVOKED";

export type AuditLog = {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  entityType: string;
  entityId: string | null;
  eventType: AuditEventType | string;
  eventMetadata: Record<string, unknown>;
  ipHash: string | null;
  createdAt: string;
};

export type DashboardStats = {
  totalCandidates: number;
  totalCredentials: number;
  issuedCredentials: number;
  draftCredentials: number;
  revokedCredentials: number;
  verifiedCredentials: number;
};
