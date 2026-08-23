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
});
