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

export type AcademicClassification =
  | "FIRST_CLASS_WITH_DISTINCTION"
  | "FIRST_CLASS"
  | "SECOND_CLASS"
  | "PASS";

export type BTechDegreePayload = {
  programType: "BTECH";
  programName: string;
  degreeTitle: string;
  totalSemesters: 8;
  cumulativeGpa: number;
  totalCreditsEarned: number;
  classification: AcademicClassification;
  semesterCredentialIds: string[];
  issueYear?: string;
  graduationDate?: string;
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

export type SemesterEligibilityCheck = {
  semesterNumber: number;
  credentialId?: string;
  credentialNumber?: string;
  status?: CredentialStatus;
  resultStatus?: "PASS" | "FAIL" | "WITHHELD";
  semesterGpa?: number;
  credits?: number;
  isCompleted: boolean;
  isPassed: boolean;
  isRevoked: boolean;
  isValid: boolean;
  issues: string[];
};

export type DegreeEligibilityResult = {
  candidateId: string;
  organizationId: string;
  programType: "BTECH";
  programName: string;
  isEligible: boolean;
  totalRequiredSemesters: 8;
  completedSemestersCount: number;
  passedSemestersCount: number;
  cumulativeGpa: number;
  totalCreditsEarned: number;
  projectedClassification: AcademicClassification;
  semesters: SemesterEligibilityCheck[];
  ineligibilityReasons: string[];
};

export type ConstituentSemesterVerification = {
  semesterNumber: number;
  credentialId: string;
  credentialNumber: string;
  status: VerificationStatus;
  isPassed: boolean;
  semesterGpa: number;
  credits: number;
  hashMismatch?: boolean;
  dbHash?: string | null;
  blockchainHash?: string | null;
};

export type VerificationStatus =
  | "VERIFIED"
  | "TAMPERED"
  | "REVOKED"
  | "ISSUED_WITH_REVOKED_PREREQUISITE"
  | "NOT_FOUND"
  | "INVALID"
  | "PENDING_BLOCKCHAIN";

export type VerificationResult = {
  status: VerificationStatus;
  dbHash?: string | null;
  computedHash?: string;
  blockchainHash?: string;
  hashMismatch?: boolean;
  degreeDetails?: {
    programName: string;
    degreeTitle: string;
    cumulativeGpa: number;
    totalCreditsEarned: number;
    classification: AcademicClassification;
    totalSemesters: number;
  };
  chainVerification?: {
    isChainValid: boolean;
    totalConstituentSemesters: number;
    verifiedSemestersCount: number;
    constituentSemesters: ConstituentSemesterVerification[];
    chainIssues: string[];
  };
};

export type CredentialRelationship = {
  id: string;
  sourceCredentialId: string;
  targetCredentialId: string;
  relationshipType: "DERIVED_FROM" | "PART_OF" | "SUPPORTS" | "PREREQUISITE_FOR";
  createdAt: string;
};

export type AuditEventType =
  | "ORGANIZATION_CREATED"
  | "CANDIDATE_CREATED"
  | "CREDENTIAL_CREATED"
  | "CREDENTIAL_UPDATED"
  | "CREDENTIAL_FINALIZED"
  | "CREDENTIAL_VERIFIED"
  | "CREDENTIAL_TAMPER_DETECTED"
  | "CREDENTIAL_REVOKED"
  | "DEGREE_CREDENTIAL_ISSUED";

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
  verifiedCredentials?: number;
};
