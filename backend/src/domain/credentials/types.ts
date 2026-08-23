export type CredentialStatus = "DRAFT" | "FINALIZED" | "ISSUED" | "REVOKED";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonObject = { [key: string]: JsonValue };

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
  finalizedAt?: string | null;
  payload?: JsonObject;
  semester?: {
    number: number;
    resultStatus: "PASS" | "FAIL" | "WITHHELD";
    semesterGpa: number;
    overallGpa?: number | null;
    subjects: CredentialSubject[];
  };
  parentCredentialIds?: string[];
};
