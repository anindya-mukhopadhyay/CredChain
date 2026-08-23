import { describe, expect, it } from "vitest";
import {
  canonicalizeCredential,
  hashCanonicalCredential
} from "../domain/credentials/canonicalCredential.js";
import type { CanonicalCredential } from "../domain/credentials/types.js";

const baseCredential: CanonicalCredential = {
  credentialId: "cred-sem-1",
  credentialType: "BTECH_SEMESTER_MARKSHEET",
  candidateId: "cand-001",
  organizationId: "org-001",
  issueDate: "2026-08-24",
  expiryDate: null,
  status: "FINALIZED",
  semester: {
    number: 1,
    resultStatus: "PASS",
    semesterGpa: 8.6,
    overallGpa: 8.6,
    subjects: [
      {
        subjectCode: "CS101",
        subjectName: "Programming Fundamentals",
        credits: 4,
        grade: "A",
        marks: 88
      }
    ]
  }
};

describe("canonical credential hashing", () => {
  it("produces deterministic canonical JSON independent of object insertion order", () => {
    const reordered = {
      status: baseCredential.status,
      issueDate: baseCredential.issueDate,
      organizationId: baseCredential.organizationId,
      credentialType: baseCredential.credentialType,
      credentialId: baseCredential.credentialId,
      candidateId: baseCredential.candidateId,
      expiryDate: baseCredential.expiryDate,
      semester: baseCredential.semester
    };

    expect(canonicalizeCredential(reordered)).toBe(canonicalizeCredential(baseCredential));
    expect(hashCanonicalCredential(reordered)).toBe(hashCanonicalCredential(baseCredential));
  });

  it("changes the hash when credential data is tampered", () => {
    const originalHash = hashCanonicalCredential(baseCredential);
    const tamperedHash = hashCanonicalCredential({
      ...baseCredential,
      semester: {
        ...baseCredential.semester!,
        subjects: [
          {
            ...baseCredential.semester!.subjects[0],
            marks: 98
          }
        ]
      }
    });

    expect(tamperedHash).not.toBe(originalHash);
  });
});

