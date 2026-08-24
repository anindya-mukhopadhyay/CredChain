# CredChain Architecture Specification

## 1. System Goals & Design Principles

CredChain is engineered as an enterprise-grade academic credential platform that provides tamper-evident cryptographic provenance without storing sensitive student PII or transcripts on-chain.

### Core Principles
1. **Zero-PII On-Chain**: The blockchain stores only 32-byte cryptographic hashes (`bytes32`), credential IDs, issuer addresses, and status flags.
2. **Deterministic Canonical Hashing**: All JSON payload fields are sorted lexicographically before SHA-256 hashing to guarantee exact hash reproducibility.
3. **Recursive DAG Verification**: Higher-order credentials (such as B.Tech Degrees) cryptographically link to their constituent semester marksheets and verify prerequisite integrity recursively.
4. **Multi-Tenant Organization Isolation**: Strict tenancy guarantees ensure university data cannot be accessed, modified, or revoked across institutions.

---

## 2. End-to-End Component Flow

```
+-----------------------------------------------------------------------------------+
|                                 Next.js Frontend                                  |
|         (Dashboard, Marksheet Builder, Degree Hub, Public Verification)           |
+-----------------------------------------+-----------------------------------------+
                                          | HTTP / JSON (HttpOnly Session Cookie)
                                          v
+-----------------------------------------------------------------------------------+
|                                Fastify API Server                                 |
|  - Plugins: @fastify/helmet, @fastify/cors, @fastify/cookie, @fastify/rate-limit  |
|  - Auth: JWT token verification, CSRF defense, organization tenancy guard         |
|  - Routes: Auth, Users, Organizations, Candidates, Credentials, Verify, Audits    |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                                 Business Services                                 |
|  - AuthService: Salted Bcrypt hashing, session issuance, demo account seeding     |
|  - UserService: Multi-tenant user provisioning, role assignments, status toggles  |
|  - CandidateService: Candidate registration, search, and profile management       |
|  - CredentialService: Draft creation, canonicalization, DAG degree eligibility    |
|  - BlockchainService: Ethers.js v6 JSON-RPC client, contract interaction          |
+-------------------+---------------------------------------+-----------------------+
                    |                                       |
                    v                                       v
+-----------------------------------+   +-------------------------------------------+
|      Repository Layer (CRUD)      |   |            Smart Contract Layer           |
|  - UserRepository                 |   |  - CredentialRegistry.sol (Solidity 0.8)  |
|  - OrganizationRepository         |   |  - EVM Storage:                           |
|  - CandidateRepository            |   |      * documentHash (bytes32)             |
|  - CredentialRepository           |   |      * issuer (address)                   |
|  - AuditRepository                |   |      * status (ACTIVE, REVOKED)           |
+-------------------+---------------+   |      * relationships (parent/child)       |
                    |                   +-------------------------------------------+
                    v
+-----------------------------------+
|           PostgreSQL 16           |
|  - Off-chain confidential storage |
|  - Multi-tenant foreign keys      |
|  - Immutable audit trail logs     |
+-----------------------------------+
```

---

## 3. Academic Credential DAG & B.Tech Degree Pipeline

CredChain models academic degrees as a Directed Acyclic Graph (DAG) of prerequisite semester marksheets.

```
  [Sem 1 Marksheet] ──► Canonical Hash ──► Smart Contract Proof #1
  [Sem 2 Marksheet] ──► Canonical Hash ──► Smart Contract Proof #2
  [Sem 3 Marksheet] ──► Canonical Hash ──► Smart Contract Proof #3
  [Sem 4 Marksheet] ──► Canonical Hash ──► Smart Contract Proof #4
  [Sem 5 Marksheet] ──► Canonical Hash ──► Smart Contract Proof #5
  [Sem 6 Marksheet] ──► Canonical Hash ──► Smart Contract Proof #6
  [Sem 7 Marksheet] ──► Canonical Hash ──► Smart Contract Proof #7
  [Sem 8 Marksheet] ──► Canonical Hash ──► Smart Contract Proof #8
                           │
                           ▼
  ===================================================================
     Automated Degree Eligibility Engine (CandidateService / SQL)
     * All 8 Semesters Completed? (Yes)
     * All 8 Semesters Passed? (Yes)
     * Credit-weighted Cumulative GPA Calculation (CGPA)
     * Academic Classification (Distinction / First Class / Second Class)
  ===================================================================
                           │
                           ▼
  [B.Tech Degree Certificate]
  (Payload embeds array of 8 constituent semester credential IDs)
                           │
                           ▼
  [Cryptographic Commitment Root]
  Deterministic SHA-256 hash across degree payload + constituent links
                           │
                           ▼
  [Smart Contract Anchoring] ──► CredentialRegistry Proof #9
                           │
                           ▼
  [Public Verification Portal]
  Recursively evaluates all 8 prerequisite marksheets in real-time
```

---

## 4. Verification Decision Engine

When a recruiter or verifier queries `/api/v1/credentials/:id/verify`, the verification engine executes the following decision matrix:

1. **Existence Check**: Queries the off-chain database. If not found, returns `NOT_FOUND`.
2. **Draft Check**: If status is `DRAFT`, returns `INVALID` (cannot verify unfinalized drafts).
3. **Database Revocation Check**: If marked `REVOKED` in the database or revocation registry, returns `REVOKED`.
4. **Canonical Integrity Check**: Recomputes the deterministic SHA-256 hash from the live operational payload and compares it against `credential.canonical_hash`. If mismatched, returns `TAMPERED`.
5. **Blockchain Proof Check**: Queries `CredentialRegistry.getCredential(id)` via `BlockchainService`:
   * If on-chain status is revoked (`status === 2`), returns `REVOKED`.
   * If on-chain `documentHash` differs from the computed canonical hash, returns `TAMPERED`.
   * If on-chain `issuer` address lacks `ISSUER_ROLE`, returns `UNTRUSTED_ISSUER`.
   * If proof is not yet indexed or node is unreachable, returns `PENDING_BLOCKCHAIN`.
6. **Recursive Constituent Prerequisite Audit** (for `BTECH_DEGREE`):
   * Recursively executes verification for all 8 constituent semester credentials.
   * If any constituent semester is `REVOKED`, returns **`ISSUED_WITH_REVOKED_PREREQUISITE`** and lists the affected semester IDs.
   * If any constituent semester is `TAMPERED`, returns `TAMPERED`.
   * If any constituent semester is `UNTRUSTED_ISSUER`, returns `UNTRUSTED_ISSUER`.
7. **Success**: If all checks pass, returns **`VERIFIED`** along with safe, publicly disclosable academic metadata.
