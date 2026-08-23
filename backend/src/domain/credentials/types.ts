export type CredentialStatus = "DRAFT" | "FINALIZED" | "ISSUED" | "REVOKED";

export type CredentialSubject = {
  subjectCode: string;
  subjectName: string;
  credits: number;
  grade: string;
  marks?: number;
};

export type CanonicalCredential = {
  credentialId: string;
  credentialType: string;
  candidateId: string;
  organizationId: string;
  issueDate: string;
  expiryDate?: string | null;
  status: CredentialStatus;
  semester?: {
    number: number;
    resultStatus: "PASS" | "FAIL" | "WITHHELD";
    semesterGpa: number;
    overallGpa?: number | null;
    subjects: CredentialSubject[];
  };
  parentCredentialIds?: string[];
};

