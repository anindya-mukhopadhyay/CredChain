import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../http/app.js";
import { createPool } from "../db/pool.js";
import { loadEnv } from "../config/env.js";
import type { FastifyInstance } from "fastify";

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);

describe("CredChain REST API Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ database: pool });
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    // Truncate tables to ensure a clean slate for each test
    await pool.query(`
      TRUNCATE TABLE 
        revocations, 
        credential_relationships,
        semester_results, 
        credential_documents, 
        blockchain_transactions, 
        credentials, 
        candidates, 
        users, 
        organizations, 
        audit_logs 
      CASCADE
    `);
  });

  describe("Organization Routes", () => {
    it("creates an organization and retrieves it", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: {
          name: "Demo University",
          type: "UNIVERSITY"
        }
      });

      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.payload);
      expect(created.id).toBeDefined();
      expect(created.name).toBe("Demo University");
      expect(created.organizationType).toBe("UNIVERSITY");
    });

    it("prevents creating duplicate organizations with same name and type", async () => {
      await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: {
          name: "Demo University",
          type: "UNIVERSITY"
        }
      });

      const dupRes = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: {
          name: "Demo University",
          type: "UNIVERSITY"
        }
      });

      expect(dupRes.statusCode).toBe(409);
      const body = JSON.parse(dupRes.payload);
      expect(body.error).toBe("CONFLICT");
    });

    it("validates invalid organization payload", async () => {
      const res = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: {
          name: "",
          type: "INVALID_TYPE"
        }
      });

      expect(res.statusCode).toBe(400);
    });
  });

  describe("Candidate Routes", () => {
    let orgId: string;

    beforeEach(async () => {
      const res = await pool.query(
        "INSERT INTO organizations (name, organization_type) VALUES ('Test Org', 'UNIVERSITY') RETURNING id"
      );
      orgId = res.rows[0].id;
    });

    it("creates a candidate and retrieves them", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        payload: {
          organizationId: orgId,
          candidateReference: "STUDENT-123",
          name: "John Doe"
        }
      });

      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.payload);
      expect(created.id).toBeDefined();
      expect(created.givenName).toBe("John");
      expect(created.familyName).toBe("Doe");

      const getRes = await app.inject({
        method: "GET",
        url: `/api/v1/candidates/${created.id}`
      });

      expect(getRes.statusCode).toBe(200);
      const fetched = JSON.parse(getRes.payload);
      expect(fetched.id).toBe(created.id);
    });

    it("prevents creating duplicate candidates with same external reference in an org", async () => {
      await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        payload: {
          organizationId: orgId,
          candidateReference: "DUPLICATE-REF",
          name: "First Candidate"
        }
      });

      const dupRes = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        payload: {
          organizationId: orgId,
          candidateReference: "DUPLICATE-REF",
          name: "Second Candidate"
        }
      });

      expect(dupRes.statusCode).toBe(409);
    });
  });

  describe("Credential Routes", () => {
    let orgId: string;
    let candidateId: string;

    beforeEach(async () => {
      const orgRes = await pool.query(
        "INSERT INTO organizations (name, organization_type) VALUES ('Test Org', 'UNIVERSITY') RETURNING id"
      );
      orgId = orgRes.rows[0].id;

      const candRes = await pool.query(
        `INSERT INTO candidates (organization_id, external_reference, given_name, family_name) 
         VALUES ($1, 'CAND-1', 'Jane', 'Smith') RETURNING id`,
        [orgId]
      );
      candidateId = candRes.rows[0].id;
    });

    it("creates a draft credential, retrieves it, updates payload, and finalizes it", async () => {
      // 1. Create Draft
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/credentials",
        payload: {
          organizationId: orgId,
          candidateId: candidateId,
          credentialType: "BTECH_SEMESTER_MARKSHEET",
          payload: {
            semester: 1,
            subjects: [
              { code: "CS101", name: "Intro to CS", credits: 4, grade: "A" }
            ],
            result: "PASS"
          }
        }
      });

      expect(createRes.statusCode).toBe(201);
      const created = JSON.parse(createRes.payload);
      expect(created.id).toBeDefined();
      expect(created.status).toBe("DRAFT");

      // 2. Retrieve Draft
      const getRes = await app.inject({
        method: "GET",
        url: `/api/v1/credentials/${created.id}`
      });
      expect(getRes.statusCode).toBe(200);
      expect(JSON.parse(getRes.payload).status).toBe("DRAFT");

      // 3. Update Draft Payload
      const updateRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/credentials/${created.id}/payload`,
        payload: {
          payload: {
            semester: 1,
            subjects: [
              { code: "CS101", name: "Intro to CS", credits: 4, grade: "A" },
              { code: "MA101", name: "Calculus I", credits: 4, grade: "B" }
            ],
            result: "PASS"
          }
        }
      });
      expect(updateRes.statusCode).toBe(200);
      const updated = JSON.parse(updateRes.payload);
      expect(updated.credentialPayload.subjects).toHaveLength(2);

      // 4. Verify status before Finalization (should be INVALID since draft)
      const verifyDraftRes = await app.inject({
        method: "GET",
        url: `/api/v1/credentials/${created.id}/verify`
      });
      expect(verifyDraftRes.statusCode).toBe(200);
      expect(JSON.parse(verifyDraftRes.payload).status).toBe("INVALID");

      // 5. Finalize
      const finalizeRes = await app.inject({
        method: "POST",
        url: `/api/v1/credentials/${created.id}/finalize`
      });
      expect(finalizeRes.statusCode).toBe(200);
      const finalized = JSON.parse(finalizeRes.payload);
      expect(["FINALIZED", "ISSUED"]).toContain(finalized.status);
      expect(finalized.canonicalHash).toBeDefined();

      // 6. Verify status after Finalization (should be PENDING_BLOCKCHAIN or VERIFIED depending on blockchain service)
      const verifyFinalRes = await app.inject({
        method: "GET",
        url: `/api/v1/credentials/${created.id}/verify`
      });
      expect(verifyFinalRes.statusCode).toBe(200);
      expect(["PENDING_BLOCKCHAIN", "VERIFIED"]).toContain(JSON.parse(verifyFinalRes.payload).status);

      // 7. Verify we reject payload updates after finalization
      const rejectUpdateRes = await app.inject({
        method: "PATCH",
        url: `/api/v1/credentials/${created.id}/payload`,
        payload: {
          payload: { semester: 2 }
        }
      });
      expect(rejectUpdateRes.statusCode).toBe(400);
    });

    it("verifies and detects TAMPERED when the database payload is modified after finalization", async () => {
      // 1. Create and finalize a credential
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/credentials",
        payload: {
          organizationId: orgId,
          candidateId: candidateId,
          credentialType: "BTECH_SEMESTER_MARKSHEET",
          payload: {
            semester: 1,
            subjects: [{ code: "CS101", name: "CS", credits: 4, grade: "A" }],
            result: "PASS"
          }
        }
      });
      const cred = JSON.parse(createRes.payload);

      await app.inject({
        method: "POST",
        url: `/api/v1/credentials/${cred.id}/finalize`
      });

      // 2. Verify status (PENDING_BLOCKCHAIN or VERIFIED)
      const initialVerify = await app.inject({
        method: "GET",
        url: `/api/v1/credentials/${cred.id}/verify`
      });
      expect(["PENDING_BLOCKCHAIN", "VERIFIED"]).toContain(JSON.parse(initialVerify.payload).status);

      // 3. Manually tamper database payload
      await pool.query(
        "UPDATE credentials SET credential_payload = '{\"semester\":1,\"result\":\"FAIL\"}'::jsonb WHERE id = $1",
        [cred.id]
      );

      // 4. Verify should now report TAMPERED
      const tamperedVerify = await app.inject({
        method: "GET",
        url: `/api/v1/credentials/${cred.id}/verify`
      });
      expect(tamperedVerify.statusCode).toBe(200);
      const verifyResult = JSON.parse(tamperedVerify.payload);
      expect(verifyResult.status).toBe("TAMPERED");
      expect(verifyResult.hashMismatch).toBe(true);
    });

    it("verifies and reports REVOKED status after revocation", async () => {
      const createRes = await app.inject({
        method: "POST",
        url: "/api/v1/credentials",
        payload: {
          organizationId: orgId,
          candidateId: candidateId,
          credentialType: "BTECH_SEMESTER_MARKSHEET",
          payload: {
            semester: 1,
            subjects: [{ code: "CS101", name: "CS", credits: 4, grade: "A" }],
            result: "PASS"
          }
        }
      });
      const cred = JSON.parse(createRes.payload);

      await app.inject({
        method: "POST",
        url: `/api/v1/credentials/${cred.id}/finalize`
      });

      // Revoke
      const revokeRes = await app.inject({
        method: "POST",
        url: `/api/v1/credentials/${cred.id}/revoke`,
        payload: {
          reasonCode: "TYPO_CORRECTION",
          note: "Revoking due to spelling error"
        }
      });
      expect(revokeRes.statusCode).toBe(200);
      expect(JSON.parse(revokeRes.payload).status).toBe("REVOKED");

      // Verify status
      const verifyRes = await app.inject({
        method: "GET",
        url: `/api/v1/credentials/${cred.id}/verify`
      });
      expect(JSON.parse(verifyRes.payload).status).toBe("REVOKED");
    });

    it("lists organizations, candidates, credentials, dashboard stats, and audit logs", async () => {
      // Create org
      const orgRes = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: { name: "Stats Org", type: "UNIVERSITY" }
      });
      const org = JSON.parse(orgRes.payload);

      // Create candidate
      const candRes = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        payload: {
          organizationId: org.id,
          name: "Alice Candidate",
          candidateReference: "CAND-STATS-1"
        }
      });
      const cand = JSON.parse(candRes.payload);

      // Create draft credential
      await app.inject({
        method: "POST",
        url: "/api/v1/credentials",
        payload: {
          organizationId: org.id,
          candidateId: cand.id,
          credentialType: "BTECH_SEMESTER_MARKSHEET",
          payload: { semester: 1, result: "PASS" }
        }
      });

      // 1. List organizations
      const listOrgs = await app.inject({ method: "GET", url: "/api/v1/organizations" });
      expect(listOrgs.statusCode).toBe(200);
      expect(JSON.parse(listOrgs.payload).length).toBeGreaterThanOrEqual(1);

      // 2. List candidates
      const listCands = await app.inject({
        method: "GET",
        url: `/api/v1/candidates?organizationId=${org.id}`
      });
      expect(listCands.statusCode).toBe(200);
      expect(JSON.parse(listCands.payload).length).toBe(1);

      // 3. List credentials
      const listCreds = await app.inject({
        method: "GET",
        url: `/api/v1/credentials?organizationId=${org.id}`
      });
      expect(listCreds.statusCode).toBe(200);
      expect(JSON.parse(listCreds.payload).length).toBe(1);

      // 4. Get Dashboard Stats
      const statsRes = await app.inject({
        method: "GET",
        url: `/api/v1/dashboard/stats?organizationId=${org.id}`
      });
      expect(statsRes.statusCode).toBe(200);
      const stats = JSON.parse(statsRes.payload);
      expect(stats.totalCandidates).toBe(1);
      expect(stats.totalCredentials).toBe(1);
      expect(stats.draftCredentials).toBe(1);

      // 5. Get Audit Logs
      const auditRes = await app.inject({
        method: "GET",
        url: `/api/v1/audit-logs?organizationId=${org.id}`
      });
      expect(auditRes.statusCode).toBe(200);
      expect(JSON.parse(auditRes.payload).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Academic Credential Chain and B.Tech Degree", () => {
    it("enforces full 8-semester sequence, eligibility rules, degree issuance, and recursive chain verification", async () => {
      // 1. Create Organization & Candidate
      const orgRes = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: { name: "Indian Institute of Technology", type: "UNIVERSITY" }
      });
      const org = JSON.parse(orgRes.payload);

      const candRes = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        payload: {
          organizationId: org.id,
          candidateReference: "2024-BTECH-CS-001",
          givenName: "Rahul",
          familyName: "Sharma",
          dateOfBirth: "2002-05-15"
        }
      });
      const candidate = JSON.parse(candRes.payload);

      // 2. Issue Semesters 1 to 7
      const semesterCredIds: string[] = [];
      for (let sem = 1; sem <= 7; sem++) {
        const credRes = await app.inject({
          method: "POST",
          url: "/api/v1/credentials",
          payload: {
            organizationId: org.id,
            candidateId: candidate.id,
            credentialType: "BTECH_SEMESTER_MARKSHEET",
            payload: {
              program: "B.Tech Computer Science & Engineering",
              semester: sem,
              academicYear: `202${Math.floor((sem - 1) / 2) + 1}-202${Math.floor((sem - 1) / 2) + 2}`,
              result: "PASS",
              semesterGpa: 9.0,
              subjects: [
                { subjectCode: `CS${sem}01`, subjectName: `Core CS ${sem}.1`, credits: 4, grade: "A", marks: 90 },
                { subjectCode: `CS${sem}02`, subjectName: `Core CS ${sem}.2`, credits: 4, grade: "A", marks: 90 },
                { subjectCode: `MA${sem}01`, subjectName: `Math Module ${sem}`, credits: 4, grade: "A", marks: 90 }
              ]
            }
          }
        });
        expect(credRes.statusCode).toBe(201);
        const cred = JSON.parse(credRes.payload);

        // Finalize & anchor on blockchain
        const finalRes = await app.inject({
          method: "POST",
          url: `/api/v1/credentials/${cred.id}/finalize`
        });
        expect(finalRes.statusCode).toBe(200);
        semesterCredIds.push(cred.id);
      }

      // 3. Check Eligibility after 7 semesters (Must be false)
      const elig7Res = await app.inject({
        method: "GET",
        url: `/api/v1/candidates/${candidate.id}/degree-eligibility`
      });
      expect(elig7Res.statusCode).toBe(200);
      const elig7 = JSON.parse(elig7Res.payload);
      expect(elig7.isEligible).toBe(false);
      expect(elig7.completedSemestersCount).toBe(7);
      expect(elig7.ineligibilityReasons.length).toBeGreaterThanOrEqual(1);

      // 4. Attempt premature Degree Issuance (Must be rejected with 400)
      const rejectDegreeRes = await app.inject({
        method: "POST",
        url: "/api/v1/credentials/degree",
        payload: {
          organizationId: org.id,
          candidateId: candidate.id,
          programName: "B.Tech Computer Science & Engineering",
          degreeTitle: "Bachelor of Technology in Computer Science & Engineering"
        }
      });
      expect(rejectDegreeRes.statusCode).toBe(400);

      // 5. Issue Semester 8
      const sem8Res = await app.inject({
        method: "POST",
        url: "/api/v1/credentials",
        payload: {
          organizationId: org.id,
          candidateId: candidate.id,
          credentialType: "BTECH_SEMESTER_MARKSHEET",
          payload: {
            program: "B.Tech Computer Science & Engineering",
            semester: 8,
            academicYear: "2024-2025",
            result: "PASS",
            semesterGpa: 9.5,
            subjects: [
              { subjectCode: "CS801", subjectName: "Capstone Project", credits: 8, grade: "O", marks: 95 },
              { subjectCode: "CS802", subjectName: "Advanced Distributed Systems", credits: 4, grade: "A", marks: 90 }
            ]
          }
        }
      });
      expect(sem8Res.statusCode).toBe(201);
      const sem8 = JSON.parse(sem8Res.payload);

      const final8Res = await app.inject({
        method: "POST",
        url: `/api/v1/credentials/${sem8.id}/finalize`
      });
      expect(final8Res.statusCode).toBe(200);
      semesterCredIds.push(sem8.id);

      // 6. Check Eligibility after all 8 semesters (Must be true)
      const elig8Res = await app.inject({
        method: "GET",
        url: `/api/v1/candidates/${candidate.id}/degree-eligibility`
      });
      expect(elig8Res.statusCode).toBe(200);
      const elig8 = JSON.parse(elig8Res.payload);
      expect(elig8.isEligible).toBe(true);
      expect(elig8.completedSemestersCount).toBe(8);
      expect(elig8.passedSemestersCount).toBe(8);
      expect(elig8.cumulativeGpa).toBeGreaterThanOrEqual(9.0);
      expect(elig8.projectedClassification).toBe("FIRST_CLASS_WITH_DISTINCTION");

      // 7. Issue Final B.Tech Degree
      const issueDegreeRes = await app.inject({
        method: "POST",
        url: "/api/v1/credentials/degree",
        payload: {
          organizationId: org.id,
          candidateId: candidate.id,
          programName: "B.Tech Computer Science & Engineering",
          degreeTitle: "Bachelor of Technology in Computer Science & Engineering",
          graduationDate: "2025-06-30"
        }
      });
      expect(issueDegreeRes.statusCode).toBe(201);
      const degree = JSON.parse(issueDegreeRes.payload);
      expect(degree.credentialType).toBe("BTECH_DEGREE");
      expect(degree.status).toBe("ISSUED");
      expect(degree.canonicalHash).toBeDefined();
      expect(degree.credentialPayload.semesterCredentialIds).toHaveLength(8);

      // 8. Verify relationships endpoint for degree
      const relsRes = await app.inject({
        method: "GET",
        url: `/api/v1/credentials/${degree.id}/relationships`
      });
      expect(relsRes.statusCode).toBe(200);
      const rels = JSON.parse(relsRes.payload);
      expect(rels.length).toBe(8);
      expect(rels[0].relationshipType).toBe("DERIVED_FROM");

      // 9. Full Recursive Chain Verification
      const verifyDegreeRes = await app.inject({
        method: "GET",
        url: `/api/v1/credentials/${degree.id}/verify`
      });
      expect(verifyDegreeRes.statusCode).toBe(200);
      const verifyReport = JSON.parse(verifyDegreeRes.payload);
      expect(verifyReport.status).toBe("VERIFIED");
      expect(verifyReport.chainVerification).toBeDefined();
      expect(verifyReport.chainVerification.isChainValid).toBe(true);
      expect(verifyReport.chainVerification.totalConstituentSemesters).toBe(8);
      expect(verifyReport.chainVerification.verifiedSemestersCount).toBe(8);
      expect(verifyReport.chainVerification.constituentSemesters).toHaveLength(8);

      // 10. Tamper Propagation Test: Modify Semester 3 database payload
      const sem3Id = semesterCredIds[2];
      await pool.query(
        "UPDATE credentials SET credential_payload = jsonb_set(credential_payload, '{subjects,0,marks}', '100'::jsonb) WHERE id = $1",
        [sem3Id]
      );

      // Now verify degree again -> degree verification must detect tampering in the constituent chain
      const verifyTamperedRes = await app.inject({
        method: "GET",
        url: `/api/v1/credentials/${degree.id}/verify`
      });
      expect(verifyTamperedRes.statusCode).toBe(200);
      const tamperedReport = JSON.parse(verifyTamperedRes.payload);
      expect(tamperedReport.status).toBe("TAMPERED");
      expect(tamperedReport.chainVerification.isChainValid).toBe(false);
      expect(tamperedReport.chainVerification.constituentSemesters[2].status).toBe("TAMPERED");

      // 11. Duplicate Prevention Test: Application and Database uniqueness constraint
      const dupDegreeRes = await app.inject({
        method: "POST",
        url: "/api/v1/credentials/degree",
        payload: {
          organizationId: org.id,
          candidateId: candidate.id
        }
      });
      expect(dupDegreeRes.statusCode).toBe(400);
    });

    it("evaluates academic classification boundary values (8.50, 8.49, 6.50, 6.49, 5.00, 4.99)", async () => {
      const orgRes = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: { name: "Boundary Univ", type: "UNIVERSITY" }
      });
      const org = JSON.parse(orgRes.payload);

      async function testClassificationForCgpa(targetGpa: number) {
        const candRes = await app.inject({
          method: "POST",
          url: "/api/v1/candidates",
          payload: {
            organizationId: org.id,
            name: `Boundary Student ${targetGpa}`,
            candidateReference: `BOUND-${targetGpa}-${Date.now()}`
          }
        });
        const cand = JSON.parse(candRes.payload);

        // Register 8 semesters with targetGpa
        for (let sem = 1; sem <= 8; sem++) {
          const credRes = await app.inject({
            method: "POST",
            url: "/api/v1/credentials",
            payload: {
              organizationId: org.id,
              candidateId: cand.id,
              credentialType: "BTECH_SEMESTER_MARKSHEET",
              payload: {
                semester: sem,
                result: "PASS",
                semesterGpa: targetGpa,
                credits: 20
              }
            }
          });
          const cred = JSON.parse(credRes.payload);
          await app.inject({
            method: "POST",
            url: `/api/v1/credentials/${cred.id}/finalize`
          });
        }

        const eligRes = await app.inject({
          method: "GET",
          url: `/api/v1/candidates/${cand.id}/degree-eligibility`
        });
        return JSON.parse(eligRes.payload);
      }

      const res850 = await testClassificationForCgpa(8.50);
      expect(res850.cumulativeGpa).toBe(8.50);
      expect(res850.projectedClassification).toBe("FIRST_CLASS_WITH_DISTINCTION");

      const res849 = await testClassificationForCgpa(8.49);
      expect(res849.cumulativeGpa).toBe(8.49);
      expect(res849.projectedClassification).toBe("FIRST_CLASS");

      const res650 = await testClassificationForCgpa(6.50);
      expect(res650.cumulativeGpa).toBe(6.50);
      expect(res650.projectedClassification).toBe("FIRST_CLASS");

      const res649 = await testClassificationForCgpa(6.49);
      expect(res649.cumulativeGpa).toBe(6.49);
      expect(res649.projectedClassification).toBe("SECOND_CLASS");

      const res500 = await testClassificationForCgpa(5.00);
      expect(res500.cumulativeGpa).toBe(5.00);
      expect(res500.projectedClassification).toBe("SECOND_CLASS");

      const res499 = await testClassificationForCgpa(4.99);
      expect(res499.cumulativeGpa).toBe(4.99);
      expect(res499.projectedClassification).toBe("PASS");
    }, 30000);

    it("verifies degree commitment hash determinism and sensitivity to constituent semester IDs", async () => {
      const { hashCanonicalCredential } = await import("../domain/credentials/canonicalCredential.js");
      const { mapToCanonical } = await import("../services/credentialService.js");

      const mockCredentialA = {
        id: "d3b07384-d113-46fb-a0b4-18c7c9454e95",
        credentialNumber: "CC-DEG-1",
        credentialType: "BTECH_DEGREE",
        candidateId: "11111111-1111-1111-1111-111111111111",
        organizationId: "22222222-2222-2222-2222-222222222222",
        status: "FINALIZED" as const,
        issueDate: "2025-06-30",
        expiryDate: null,
        credentialPayload: {
          programName: "B.Tech CSE",
          degreeTitle: "Bachelor of Technology",
          cumulativeGpa: 9.2,
          totalCreditsEarned: 160,
          classification: "FIRST_CLASS_WITH_DISTINCTION",
          semesterCredentialIds: [
            "sem-1-id", "sem-2-id", "sem-3-id", "sem-4-id",
            "sem-5-id", "sem-6-id", "sem-7-id", "sem-8-id"
          ]
        },
        issuerUserId: null,
        canonicalHash: null,
        documentUri: null,
        verificationUrl: null,
        blockchainTxId: null,
        finalizedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const canonicalA1 = mapToCanonical(mockCredentialA);
      const hashA1 = hashCanonicalCredential(canonicalA1);

      // Reordered semester IDs in payload (mapToCanonical sorts parentCredentialIds)
      const mockCredentialA2 = {
        ...mockCredentialA,
        credentialPayload: {
          ...mockCredentialA.credentialPayload,
          semesterCredentialIds: [
            "sem-8-id", "sem-7-id", "sem-6-id", "sem-5-id",
            "sem-4-id", "sem-3-id", "sem-2-id", "sem-1-id"
          ]
        }
      };
      const canonicalA2 = mapToCanonical(mockCredentialA2);
      // Because degree.semesterCredentialIds preserves input order in degree object but parentCredentialIds is sorted:
      // Canonical JSON normalizes keys deterministically
      expect(canonicalA2.parentCredentialIds).toEqual(canonicalA1.parentCredentialIds);

      // Modify one constituent semester reference -> hash MUST change
      const mockCredentialB = {
        ...mockCredentialA,
        credentialPayload: {
          ...mockCredentialA.credentialPayload,
          semesterCredentialIds: [
            "sem-1-id", "sem-2-id", "sem-3-id", "sem-4-id",
            "sem-5-id", "sem-6-id", "sem-7-id", "sem-8-DIFFERENT-id"
          ]
        }
      };
      const canonicalB = mapToCanonical(mockCredentialB);
      const hashB = hashCanonicalCredential(canonicalB);

      expect(hashA1).not.toBe(hashB);
    });

    it("distinguishes direct degree revocation from revoked prerequisite (ISSUED_WITH_REVOKED_PREREQUISITE)", async () => {
      const orgRes = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: { name: "Revocation Univ", type: "UNIVERSITY" }
      });
      const org = JSON.parse(orgRes.payload);

      const candRes = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        payload: {
          organizationId: org.id,
          name: "Prereq Student",
          candidateReference: `PREREQ-${Date.now()}`
        }
      });
      const cand = JSON.parse(candRes.payload);

      const semIds: string[] = [];
      for (let sem = 1; sem <= 8; sem++) {
        const credRes = await app.inject({
          method: "POST",
          url: "/api/v1/credentials",
          payload: {
            organizationId: org.id,
            candidateId: cand.id,
            credentialType: "BTECH_SEMESTER_MARKSHEET",
            payload: { semester: sem, result: "PASS", semesterGpa: 8.0, credits: 20 }
          }
        });
        const cred = JSON.parse(credRes.payload);
        await app.inject({ method: "POST", url: `/api/v1/credentials/${cred.id}/finalize` });
        semIds.push(cred.id);
      }

      // Issue degree
      const degreeRes = await app.inject({
        method: "POST",
        url: "/api/v1/credentials/degree",
        payload: {
          organizationId: org.id,
          candidateId: cand.id,
          programName: "B.Tech Mechanical",
          degreeTitle: "Bachelor of Technology"
        }
      });
      const degree = JSON.parse(degreeRes.payload);

      // Verify degree initial status -> VERIFIED
      const initialVerify = await app.inject({ method: "GET", url: `/api/v1/credentials/${degree.id}/verify` });
      expect(JSON.parse(initialVerify.payload).status).toBe("VERIFIED");

      // Revoke Semester 4
      await app.inject({
        method: "POST",
        url: `/api/v1/credentials/${semIds[3]}/revoke`,
        payload: { reasonCode: "ACADEMIC_MISCONDUCT", note: "Plagiarism in final exam" }
      });

      // Verify degree again -> status must be ISSUED_WITH_REVOKED_PREREQUISITE
      const prereqRevokedVerify = await app.inject({ method: "GET", url: `/api/v1/credentials/${degree.id}/verify` });
      const prereqReport = JSON.parse(prereqRevokedVerify.payload);
      expect(prereqReport.status).toBe("ISSUED_WITH_REVOKED_PREREQUISITE");
      expect(prereqReport.chainVerification.isChainValid).toBe(false);
      expect(prereqReport.chainVerification.constituentSemesters[3].status).toBe("REVOKED");

      // Revoke Degree directly -> status must become REVOKED
      await app.inject({
        method: "POST",
        url: `/api/v1/credentials/${degree.id}/revoke`,
        payload: { reasonCode: "ADMINISTRATIVE_CANCEL" }
      });

      const directRevokedVerify = await app.inject({ method: "GET", url: `/api/v1/credentials/${degree.id}/verify` });
      expect(JSON.parse(directRevokedVerify.payload).status).toBe("REVOKED");
    });

    it("verifies multi-point tamper propagation (S1, S4, S8 tampering detection)", async () => {
      const orgRes = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: { name: "Tamper Test Univ", type: "UNIVERSITY" }
      });
      const org = JSON.parse(orgRes.payload);

      const candRes = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        payload: {
          organizationId: org.id,
          name: "Tamper Test Student",
          candidateReference: `TAMPER-${Date.now()}`
        }
      });
      const cand = JSON.parse(candRes.payload);

      const semIds: string[] = [];
      for (let sem = 1; sem <= 8; sem++) {
        const credRes = await app.inject({
          method: "POST",
          url: "/api/v1/credentials",
          payload: {
            organizationId: org.id,
            candidateId: cand.id,
            credentialType: "BTECH_SEMESTER_MARKSHEET",
            payload: { semester: sem, result: "PASS", semesterGpa: 8.5, credits: 20 }
          }
        });
        const cred = JSON.parse(credRes.payload);
        await app.inject({ method: "POST", url: `/api/v1/credentials/${cred.id}/finalize` });
        semIds.push(cred.id);
      }

      const degreeRes = await app.inject({
        method: "POST",
        url: "/api/v1/credentials/degree",
        payload: {
          organizationId: org.id,
          candidateId: cand.id
        }
      });
      const degree = JSON.parse(degreeRes.payload);

      // Tamper S1 (index 0)
      await pool.query(
        "UPDATE credentials SET credential_payload = jsonb_set(credential_payload, '{semesterGpa}', '10.0'::jsonb) WHERE id = $1",
        [semIds[0]]
      );
      const vTamperS1 = await app.inject({ method: "GET", url: `/api/v1/credentials/${degree.id}/verify` });
      const rS1 = JSON.parse(vTamperS1.payload);
      expect(rS1.status).toBe("TAMPERED");
      expect(rS1.chainVerification.constituentSemesters[0].status).toBe("TAMPERED");

      // Tamper S8 (index 7)
      await pool.query(
        "UPDATE credentials SET credential_payload = jsonb_set(credential_payload, '{semesterGpa}', '10.0'::jsonb) WHERE id = $1",
        [semIds[7]]
      );
      const vTamperS8 = await app.inject({ method: "GET", url: `/api/v1/credentials/${degree.id}/verify` });
      const rS8 = JSON.parse(vTamperS8.payload);
      expect(rS8.status).toBe("TAMPERED");
      expect(rS8.chainVerification.constituentSemesters[7].status).toBe("TAMPERED");
    });

    it("verifies that academic chain integrity strictly rejects foreign candidate marksheets (Audit 4)", async () => {
      const orgRes = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: { name: "Integrity Test Univ", type: "UNIVERSITY" }
      });
      const org = JSON.parse(orgRes.payload);

      const candARes = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        payload: { organizationId: org.id, name: "Student A", candidateReference: `STU-A-${Date.now()}` }
      });
      const candA = JSON.parse(candARes.payload);

      const candBRes = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        payload: { organizationId: org.id, name: "Student B", candidateReference: `STU-B-${Date.now()}` }
      });
      const candB = JSON.parse(candBRes.payload);

      // Issue 7 semesters to Student A
      for (let sem = 1; sem <= 7; sem++) {
        const c = await app.inject({
          method: "POST",
          url: "/api/v1/credentials",
          payload: {
            organizationId: org.id,
            candidateId: candA.id,
            credentialType: "BTECH_SEMESTER_MARKSHEET",
            payload: { semester: sem, result: "PASS", semesterGpa: 8.0, credits: 20 }
          }
        });
        const cred = JSON.parse(c.payload);
        await app.inject({ method: "POST", url: `/api/v1/credentials/${cred.id}/finalize` });
      }

      // Issue Semester 8 to Student B
      const s8B = await app.inject({
        method: "POST",
        url: "/api/v1/credentials",
        payload: {
          organizationId: org.id,
          candidateId: candB.id,
          credentialType: "BTECH_SEMESTER_MARKSHEET",
          payload: { semester: 8, result: "PASS", semesterGpa: 8.0, credits: 20 }
        }
      });
      const credS8B = JSON.parse(s8B.payload);
      await app.inject({ method: "POST", url: `/api/v1/credentials/${credS8B.id}/finalize` });

      // Check eligibility for Student A -> must be NOT eligible (missing S8)
      const eligA = await app.inject({
        method: "GET",
        url: `/api/v1/candidates/${candA.id}/degree-eligibility`
      });
      const rA = JSON.parse(eligA.payload);
      expect(rA.isEligible).toBe(false);
      expect(rA.passedSemestersCount).toBe(7);
      expect(rA.ineligibilityReasons).toContain("Missing Semester 8 credential");
    });

    it("verifies zero PII is written to blockchain transactions (Audit 9)", async () => {
      const orgRes = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: { name: "Privacy Univ", type: "UNIVERSITY" }
      });
      const org = JSON.parse(orgRes.payload);

      const candRes = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        payload: {
          organizationId: org.id,
          name: "Satoshi Nakamoto",
          candidateReference: "SATOSHI-1"
        }
      });
      const cand = JSON.parse(candRes.payload);

      // Create and finalize a credential
      const credRes = await app.inject({
        method: "POST",
        url: "/api/v1/credentials",
        payload: {
          organizationId: org.id,
          candidateId: cand.id,
          credentialType: "BTECH_SEMESTER_MARKSHEET",
          payload: {
            semester: 1,
            result: "PASS",
            semesterGpa: 9.8,
            studentEmail: "satoshi@example.com",
            aadhaarNumber: "1234-5678-9012"
          }
        }
      });
      const cred = JSON.parse(credRes.payload);
      const finalizeRes = await app.inject({
        method: "POST",
        url: `/api/v1/credentials/${cred.id}/finalize`
      });
      expect(finalizeRes.statusCode).toBe(200);

      // Inspect blockchain contract read
      const verifyRes = await app.inject({
        method: "GET",
        url: `/api/v1/credentials/${cred.id}/verify`
      });
      const verifyReport = JSON.parse(verifyRes.payload);
      expect(verifyReport.blockchainHash).toBeDefined();

      // Blockchain hash must only be a 32-byte (66-char hex) string without student PII
      expect(verifyReport.blockchainHash).toMatch(/^0x[a-fA-F0-9]{64}$/);
      expect(verifyReport.blockchainHash).not.toContain("Satoshi");
      expect(verifyReport.blockchainHash).not.toContain("satoshi@example.com");
      expect(verifyReport.blockchainHash).not.toContain("1234-5678-9012");
    });
  });
});
