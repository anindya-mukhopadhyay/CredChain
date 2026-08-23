import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../http/app.js";
import { createPool } from "../db/pool.js";
import { loadEnv } from "../config/env.js";
import type { FastifyInstance } from "fastify";

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);

describe("CredChain Phase 5: Authentication & RBAC Integration", () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await buildApp({ database: pool });
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    // Truncate tables for a clean slate
    await pool.query(`
      TRUNCATE TABLE 
        revocations,
        semester_results,
        credential_relationships,
        blockchain_transactions,
        credentials,
        candidates,
        audit_logs,
        users,
        organizations
      CASCADE;
    `);

    // Ensure demo seed accounts exist
    const orgRes = await app.inject({
      method: "POST",
      url: "/api/v1/organizations",
      payload: { name: "Apex Institute of Technology", type: "UNIVERSITY" }
    });
    const apexOrg = JSON.parse(orgRes.payload);

    // Create Super Admin
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "superadmin@credchain.com",
        password: "SuperAdmin2026!",
        displayName: "Super Administrator",
        role: "SUPER_ADMIN"
      }
    });

    // Create Org Admin
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "admin@apex.edu",
        password: "ApexAdmin2026!",
        displayName: "Dean of Academic Affairs",
        role: "ORGANIZATION_ADMIN",
        organizationId: apexOrg.id
      }
    });

    // Create Issuer
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "issuer@apex.edu",
        password: "ApexIssuer2026!",
        displayName: "Registrar Officer",
        role: "ISSUER",
        organizationId: apexOrg.id
      }
    });

    // Create Verifier
    await app.inject({
      method: "POST",
      url: "/api/v1/auth/register",
      payload: {
        email: "verifier@public.org",
        password: "Verifier2026!",
        displayName: "Public Background Verifier",
        role: "VERIFIER"
      }
    });
  });

  describe("1. Authentication API", () => {
    it("logs in with valid credentials and receives JWT and secure cookie", async () => {
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "issuer@apex.edu",
          password: "ApexIssuer2026!"
        }
      });

      expect(loginRes.statusCode).toBe(200);
      const data = JSON.parse(loginRes.payload);
      expect(data.token).toBeDefined();
      expect(data.user).toBeDefined();
      expect(data.user.email).toBe("issuer@apex.edu");
      expect(data.user.role).toBe("ISSUER");
      // Password hash must never leak
      expect(data.user.passwordHash).toBeUndefined();

      // Check cookie
      const cookies = loginRes.cookies;
      const authCookie = cookies.find((c) => c.name === "credchain_token");
      expect(authCookie).toBeDefined();
      expect(authCookie?.httpOnly).toBe(true);
    });

    it("rejects invalid password with generic error", async () => {
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: {
          email: "issuer@apex.edu",
          password: "WrongPassword!"
        }
      });

      expect(loginRes.statusCode).toBe(401);
      const data = JSON.parse(loginRes.payload);
      expect(data.error).toBe("INVALID_CREDENTIALS");
    });

    it("fetches authenticated profile via /api/v1/auth/me with HttpOnly cookie alone", async () => {
      // First login
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "admin@apex.edu", password: "ApexAdmin2026!" }
      });
      const authCookie = loginRes.cookies.find((c) => c.name === "credchain_token")!;

      // Call /auth/me with Cookie alone (no Bearer header)
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me",
        cookies: { credchain_token: authCookie.value }
      });

      expect(meRes.statusCode).toBe(200);
      const meData = JSON.parse(meRes.payload);
      expect(meData.email).toBe("admin@apex.edu");
      expect(meData.role).toBe("ORGANIZATION_ADMIN");
      expect(meData.passwordHash).toBeUndefined();
    });

    it("rejects /api/v1/auth/me without authentication", async () => {
      const meRes = await app.inject({
        method: "GET",
        url: "/api/v1/auth/me"
      });
      expect(meRes.statusCode).toBe(401);
    });

    it("blocks cross-site CSRF mutation requests authenticated via cookie", async () => {
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "issuer@apex.edu", password: "ApexIssuer2026!" }
      });
      const authCookie = loginRes.cookies.find((c) => c.name === "credchain_token")!;

      // Attempt cross-site state mutation with cookie
      const csrfAttack = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        cookies: { credchain_token: authCookie.value },
        headers: {
          "sec-fetch-site": "cross-site",
          "origin": "https://malicious-site.com"
        },
        payload: {
          organizationId: "00000000-0000-0000-0000-000000000000",
          name: "CSRF Injected Student"
        }
      });

      expect(csrfAttack.statusCode).toBe(403);
      expect(JSON.parse(csrfAttack.payload).error).toBe("CSRF_DETECTED");
    });
  });

  describe("2. Organization Isolation & Header Spoofing Protection", () => {
    it("strictly isolates candidate access between organizations and returns 403 Forbidden", async () => {
      // Create Organization B
      const orgBRes = await app.inject({
        method: "POST",
        url: "/api/v1/organizations",
        payload: { name: "University of Quantum Computing", type: "UNIVERSITY" }
      });
      const orgB = JSON.parse(orgBRes.payload);

      // Create Candidate in Org B
      const candBRes = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        payload: {
          organizationId: orgB.id,
          name: "Quantum Student",
          candidateReference: `Q-${Date.now()}`
        }
      });
      const candB = JSON.parse(candBRes.payload);

      // Login as Issuer from Apex Institute (Org A)
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "issuer@apex.edu", password: "ApexIssuer2026!" }
      });
      const { token } = JSON.parse(loginRes.payload);

      // Attempt 1: Org A issuer attempts to get Candidate B
      const getCandB = await app.inject({
        method: "GET",
        url: `/api/v1/candidates/${candB.id}`,
        headers: { authorization: `Bearer ${token}` }
      });
      expect(getCandB.statusCode).toBe(403); // 403 Forbidden for cross-org access

      // Attempt 2: Org A issuer attempts to spoof x-organization-id header as Org B
      const spoofCandB = await app.inject({
        method: "GET",
        url: `/api/v1/candidates/${candB.id}`,
        headers: {
          authorization: `Bearer ${token}`,
          "x-organization-id": orgB.id
        }
      });
      // Header spoofing MUST be ignored: backend checks verified JWT organization -> 403 Forbidden
      expect(spoofCandB.statusCode).toBe(403);

      // Attempt 3: Org A issuer attempts to create a credential for Candidate B in Org B
      const issueAttack = await app.inject({
        method: "POST",
        url: "/api/v1/credentials",
        headers: {
          authorization: `Bearer ${token}`,
          "x-organization-id": orgB.id
        },
        payload: {
          organizationId: orgB.id,
          candidateId: candB.id,
          credentialType: "BTECH_SEMESTER_MARKSHEET",
          payload: { semester: 1, result: "PASS" }
        }
      });
      expect(issueAttack.statusCode).toBe(403);
    });
  });

  describe("3. Role-Based Access Control (RBAC)", () => {
    it("prevents VERIFIER role from mutating candidates and credentials with 403 Forbidden", async () => {
      // Login as Verifier
      const loginRes = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "verifier@public.org", password: "Verifier2026!" }
      });
      const { token } = JSON.parse(loginRes.payload);

      const orgRes = await pool.query("SELECT id FROM organizations LIMIT 1");
      const orgId = orgRes.rows[0].id;

      // Verifier attempts to register candidate
      const candAttack = await app.inject({
        method: "POST",
        url: "/api/v1/candidates",
        headers: { authorization: `Bearer ${token}` },
        payload: { organizationId: orgId, name: "Sneaky Candidate" }
      });
      expect(candAttack.statusCode).toBe(403);

      // Verifier attempts to create credential
      const credAttack = await app.inject({
        method: "POST",
        url: "/api/v1/credentials",
        headers: { authorization: `Bearer ${token}` },
        payload: {
          organizationId: orgId,
          candidateId: "00000000-0000-0000-0000-000000000000",
          credentialType: "BTECH_SEMESTER_MARKSHEET",
          payload: { semester: 1, result: "PASS" }
        }
      });
      expect(credAttack.statusCode).toBe(403);
    });

    it("allows ORGANIZATION_ADMIN to manage users but blocks ISSUER from managing users with 403 Forbidden", async () => {
      // Login as Issuer
      const issuerLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "issuer@apex.edu", password: "ApexIssuer2026!" }
      });
      const issuerToken = JSON.parse(issuerLogin.payload).token;

      // Issuer attempts to view users
      const issuerUsers = await app.inject({
        method: "GET",
        url: "/api/v1/users",
        headers: { authorization: `Bearer ${issuerToken}` }
      });
      expect(issuerUsers.statusCode).toBe(403); // 403 Forbidden

      // Login as Org Admin
      const adminLogin = await app.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        payload: { email: "admin@apex.edu", password: "ApexAdmin2026!" }
      });
      const adminToken = JSON.parse(adminLogin.payload).token;

      // Org Admin views users
      const adminUsers = await app.inject({
        method: "GET",
        url: "/api/v1/users",
        headers: { authorization: `Bearer ${adminToken}` }
      });
      expect(adminUsers.statusCode).toBe(200);
      const userList = JSON.parse(adminUsers.payload);
      expect(userList.length).toBeGreaterThanOrEqual(2);
    });
  });
});
