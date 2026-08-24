# CredChain Live Demonstration Script & Verification Workflow

This document provides a step-by-step, reproducible walkthrough to demonstrate CredChain's end-to-end capabilities: multi-tenant authentication, candidate registration, 8-semester marksheet creation, smart contract anchoring, B.Tech degree issuance, public QR verification, simulated database tampering, prerequisite revocation, and degree invalidation.

---

## Prerequisites
Ensure all services are running locally:
1. **PostgreSQL**: `docker compose up -d postgres`
2. **Hardhat Blockchain Node**: `npm run node -w @credchain/blockchain` (Port `8545`)
3. **Contract Deployed**: `npm run deploy:local -w @credchain/blockchain`
4. **Fastify Backend**: `npm run dev -w @credchain/backend` (Port `4000`)
5. **Next.js Frontend**: `npm run dev -w @credchain/frontend` (Port `3000`)

---

## Step 1: Open Landing Page & Login
1. Navigate to `http://localhost:3000/`.
2. Inspect the Landing Page hero, features, credential lifecycle, and security architecture.
3. Click **Issuer Login** to reach `/login`.
4. Click the demo quick-fill button for **✍️ Registrar Issuer** (`issuer@apex.edu` / `ApexIssuer2026!`).
5. Click **Sign In**. You are redirected to the **Organization Dashboard** (`/dashboard`).

---

## Step 2: Register a New Candidate
1. Click **New Candidate** in the quick actions bar (or navigate to `/candidates/new`).
2. Fill in synthetic student details:
   * **Organization**: *Apex Institute of Technology*
   * **Student Roll / Reference**: `DEMO-2026-001`
   * **Given Name**: `Demo`
   * **Family Name**: `Student`
   * **Date of Birth**: `2004-01-01`
3. Click **Create Candidate Record**.
4. You are redirected to `/candidates/[id]`. Note the candidate profile and empty credential list.

---

## Step 3: Issue 8-Semester Marksheets (S1 to S8)
For each semester (1 through 8):
1. Click **Issue Credential** from the candidate profile or **Issue Marksheet** from the navigation.
2. Ensure *Apex Institute of Technology* and *Demo Student* are selected.
3. Select **Semester** (1 through 8).
4. Enter standard course modules (e.g. `CS101`, `CS102`, `MA101`, `PH101`, `EE101`) with credits (4 each) and grades (`O`, `A+`, `A`).
5. Observe real-time SGPA calculation (e.g. `9.20 / 10.0`).
6. Click **Save as Draft Marksheet**.
7. On the credential detail page (`/credentials/[id]`), click **Finalize & Register**.
8. Confirm the dialog. The credential transitions from `DRAFT` → `FINALIZED` → `ISSUED` with an on-chain transaction hash.
9. Repeat for all 8 semesters.

---

## Step 4: Evaluate Degree Eligibility & Issue B.Tech Degree
1. Navigate to `/credentials/degree` (Degree Hub) or visit Demo Student's candidate profile `/candidates/[id]`.
2. Select *Apex Institute of Technology* and *Demo Student*.
3. The automated Degree Eligibility Engine evaluates all 8 semesters:
   * **Semesters Completed**: `8 / 8`
   * **Passed Semesters**: `8 / 8`
   * **Cumulative GPA (CGPA)**: `~9.20 / 10.0`
   * **Classification**: `First Class with Distinction (Honours)`
   * **Eligibility Status**: `✓ Eligible for Degree`
4. Review the 8-Semester Progression DAG visualizer.
5. Click **Issue Official B.Tech Degree**.
6. The backend verifies eligibility, computes the cryptographic commitment DAG root across all 8 semesters, and anchors the proof on-chain.
7. You are redirected to the official B.Tech Degree certificate page (`/credentials/[id]`).

---

## Step 5: Public QR Verification (Expected: `VERIFIED`)
1. On the degree certificate page, view the **Public QR Verification** card.
2. Click **Share Credential** to inspect the QR modal. Click **Download QR** or copy the public link.
3. Click **Public Verification Portal** (or visit `/verify/[degreeId]`).
4. **Expected Output**:
   * Prominent Emerald Banner: **`✓ CREDENTIAL VERIFIED`**
   * Verification breakdown: 8 of 8 constituent semester marksheets cryptographically verified.
   * Recipient details: *Demo Student*, *Apex Institute of Technology*, *B.Tech Degree*.
   * Smart contract address: `0x5FbDB2315678afecb367f032d93F642f64180aa3`.
   * Blockchain proof hash matches stored canonical hash.

---

## Step 6: Simulate Database Tampering (Expected: `TAMPERED`)
Simulate a rogue insider attempting to alter the database records directly.
1. In a terminal, run SQL to alter Semester 4 SGPA or Grade without touching the on-chain ledger:
   ```bash
   psql "postgresql://anindyamukhopadhyay@localhost:5432/credchain" -c "
     UPDATE credentials 
     SET credential_payload = jsonb_set(credential_payload, '{semesterGpa}', '9.99')
     WHERE id IN (
       SELECT id FROM credentials WHERE credential_payload->>'semester' = '4' LIMIT 1
     );
   "
   ```
2. In the browser, refresh the verification page `/verify/[degreeId]` or verify Semester 4 marksheet directly.
3. **Expected Output**:
   * Prominent Crimson Banner: **`⚠ CREDENTIAL INTEGRITY FAILED`**
   * Technical Mechanism: The live recalculated SHA-256 hash of the modified `credential_payload` diverges from the immutable cryptographic hash anchored on the blockchain smart contract registry during issuance.

---

## Step 7: Restore Database & Test Prerequisite Revocation (Expected: `ISSUED_WITH_REVOKED_PREREQUISITE`)
1. Re-hash or restore the Semester 4 marksheet so integrity checks pass.
2. As the university registrar, navigate to the Semester 4 marksheet page (`/credentials/[sem4Id]`).
3. Click **Revoke**.
4. Select reason code: `ACADEMIC_MISCONDUCT` and note: `Semester 4 marksheet invalidated`. Confirm revocation.
5. Now, navigate to the public verification portal for the B.Tech Degree (`/verify/[degreeId]`).
6. **Expected Output**:
   * Prominent Crimson Banner: **`DEGREE HAS A REVOKED PREREQUISITE`**
   * Prerequisite Invalidation Alert lists **Semester 4 Marksheet (REVOKED)**.
   * Demonstrates CredChain's recursive prerequisite chain validation.

---

## Step 8: Revoke Degree Itself (Expected: `REVOKED`)
1. On the degree certificate page (`/credentials/[degreeId]`), click **Revoke**.
2. Select reason code: `PREREQUISITE_FAILED` and confirm revocation.
3. Refresh the public verification portal (`/verify/[degreeId]`).
4. **Expected Output**:
   * Prominent Amber/Crimson Banner: **`CREDENTIAL REVOKED`**
   * Notice: This degree credential has been officially revoked by the issuing university.
