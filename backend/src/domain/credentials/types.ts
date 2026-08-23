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
  degree?: {
    programType: "BTECH";
    programName: string;
    degreeTitle: string;
    totalSemesters: 8;
    cumulativeGpa: number;
    totalCreditsEarned: number;
    classification: AcademicClassification;
    semesterCredentialIds: string[];
  };
  parentCredentialIds?: string[];
};
