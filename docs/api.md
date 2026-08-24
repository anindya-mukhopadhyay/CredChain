# CredChain REST API Reference

This document provides the authoritative API specification for the CredChain backend service. All endpoints reside under the `/api/v1` namespace unless otherwise noted.

---

## 1. System & Health Endpoints

### 1.1 Liveness Probe
* **Method**: `GET`
* **Endpoint**: `/health/live`
* **Authentication**: None (Public)
* **Response `200 OK`**:
  ```json
  {
    "status": "alive",
    "timestamp": "2026-08-25T00:00:00.000Z"
  }
  ```

### 1.2 System Health & Readiness Probe
* **Method**: `GET`
* **Endpoint**: `/health` / `/health/ready`
* **Authentication**: None (Public)
* **Description**: Verifies active PostgreSQL connection and EVM blockchain RPC connectivity. Returns `503 Service Unavailable` if either dependency is degraded.
* **Response `200 OK`**:
  ```json
  {
    "status": "ok",
    "service": "credchain-backend",
    "database": "connected",
    "blockchain": "connected",
    "environment": "development"
  }
  ```

### 1.3 System Modules
* **Method**: `GET`
* **Endpoint**: `/api/v1/system/modules`
* **Authentication**: None (Public)
* **Response `200 OK`**:
  ```json
  {
    "modules": [
      "organization-management",
      "candidate-management",
      "credential-management",
      "credential-chain",
      "verification-portal",
      "audit-trail",
      "authentication",
      "rbac",
      "qr-verification"
    ],
    "privacyModel": "sensitive data remains off-chain; blockchain stores hashes and minimal metadata"
  }
  ```

---

## 2. Authentication & User Management

### 2.1 User Login
* **Method**: `POST`
* **Endpoint**: `/api/v1/auth/login`
* **Authentication**: None (Public)
* **Request Body**:
  ```json
  {
    "email": "issuer@apex.edu",
    "password": "ApexIssuer2026!"
  }
  ```
* **Response `200 OK`**: Sets `HttpOnly`, `SameSite=Lax`, `Secure` cookie `credchain_token`.
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "e81d4fae-7dec-11d0-a765-00a0c91e6bf6",
      "organizationId": "d74e3089-a292-4161-ba1b-90f75432655d",
      "email": "issuer@apex.edu",
      "displayName": "Registrar Officer",
      "role": "ISSUER",
      "isActive": true,
      "createdAt": "2026-08-25T00:00:00.000Z",
      "updatedAt": "2026-08-25T00:00:00.000Z"
    }
  }
  ```
* **Errors**: `400 Bad Request` (missing credentials), `401 Unauthorized` (invalid email/password).

### 2.2 Current User Profile
* **Method**: `GET`
* **Endpoint**: `/api/v1/auth/me`
* **Authentication**: Required (`credchain_token` cookie or Bearer header)
* **Response `200 OK`**: Returns `SafeUser` object.

### 2.3 User Logout
* **Method**: `POST`
* **Endpoint**: `/api/v1/auth/logout`
* **Authentication**: Required
* **Response `200 OK`**: Clears authentication cookie.

### 2.4 User Registration / Provisioning
* **Method**: `POST`
* **Endpoint**: `/api/v1/auth/register`
* **Authentication**: Required (`SUPER_ADMIN` or `ORGANIZATION_ADMIN`)
* **Request Body**:
  ```json
  {
    "email": "priya.patel@apex.edu",
    "displayName": "Dr. Priya Patel",
    "role": "ISSUER",
    "password": "CredChain2026!",
    "organizationId": "d74e3089-a292-4161-ba1b-90f75432655d"
  }
  ```
* **Response `201 Created`**: Returns `SafeUser` object and token.
* **Errors**: `400 Bad Request` (email conflict, unauthorized role escalation), `403 Forbidden`.

### 2.5 List Organization Users
* **Method**: `GET`
* **Endpoint**: `/api/v1/users`
* **Authentication**: Required (`SUPER_ADMIN` or `ORGANIZATION_ADMIN`)
* **Response `200 OK`**: Array of `SafeUser` records scoped to the caller's organization.

### 2.6 Toggle User Active Status
* **Method**: `PATCH`
* **Endpoint**: `/api/v1/users/:id/status`
* **Authentication**: Required (`SUPER_ADMIN` or `ORGANIZATION_ADMIN`)
* **Request Body**: `{ "isActive": false }`
* **Response `200 OK`**: Updated `SafeUser` object.

---

## 3. Organizations & Candidates

### 3.1 List Organizations
* **Method**: `GET`
* **Endpoint**: `/api/v1/organizations`
* **Authentication**: Optional
* **Response `200 OK`**: Array of `Organization` records.

### 3.2 Create Organization
* **Method**: `POST`
* **Endpoint**: `/api/v1/organizations`
* **Authentication**: Optional in dev / Admin required in production
* **Request Body**:
  ```json
  {
    "name": "Apex Institute of Technology",
    "type": "UNIVERSITY"
  }
  ```
* **Response `201 Created`**:
  ```json
  {
    "id": "d74e3089-a292-4161-ba1b-90f75432655d",
    "name": "Apex Institute of Technology",
    "organizationType": "UNIVERSITY",
    "verificationStatus": "VERIFIED",
    "createdAt": "2026-08-25T00:00:00.000Z"
  }
  ```

### 3.3 List Candidates
* **Method**: `GET`
* **Endpoint**: `/api/v1/candidates`
* **Query Parameters**: `organizationId` (optional)
* **Response `200 OK`**: Array of `Candidate` records.

### 3.4 Create Candidate
* **Method**: `POST`
* **Endpoint**: `/api/v1/candidates`
* **Request Body**:
  ```json
  {
    "organizationId": "d74e3089-a292-4161-ba1b-90f75432655d",
    "candidateReference": "CS-2022-042",
    "givenName": "Rahul",
    "familyName": "Sharma",
    "dateOfBirth": "2004-05-15"
  }
  ```
* **Response `201 Created`**: Returns created `Candidate` record.

### 3.5 Get Candidate by ID
* **Method**: `GET`
* **Endpoint**: `/api/v1/candidates/:id`
* **Response `200 OK`**: `Candidate` object.

---

## 4. Academic Credentials & Marksheets

### 4.1 Create Draft Marksheet / Credential
* **Method**: `POST`
* **Endpoint**: `/api/v1/credentials`
* **Authentication**: Required (`ISSUER`, `ORGANIZATION_ADMIN`, `SUPER_ADMIN`)
* **Request Body**:
  ```json
  {
    "organizationId": "d74e3089-a292-4161-ba1b-90f75432655d",
    "candidateId": "4a72d4c0-7988-4e1b-b463-c1551608eb82",
    "credentialType": "BTECH_SEMESTER_MARKSHEET",
    "payload": {
      "semester": 1,
      "academicYear": "2022-2023",
      "program": "B.Tech Computer Science & Engineering",
      "result": "PASS",
      "semesterGpa": 9.2,
      "subjects": [
        { "subjectCode": "CS101", "subjectName": "Programming in C", "credits": 4, "grade": "O", "marks": 94 },
        { "subjectCode": "MA101", "subjectName": "Calculus & Linear Algebra", "credits": 4, "grade": "A+", "marks": 89 },
        { "subjectCode": "PH101", "subjectName": "Engineering Physics", "credits": 4, "grade": "A", "marks": 82 },
        { "subjectCode": "EE101", "subjectName": "Basic Electrical Engineering", "credits": 4, "grade": "A", "marks": 85 },
        { "subjectCode": "CS102", "subjectName": "Computing Laboratory", "credits": 4, "grade": "O", "marks": 96 }
      ]
    }
  }
  ```
* **Response `201 Created`**: Returns `Credential` object with status `DRAFT`.

### 4.2 Update Draft Payload
* **Method**: `PATCH`
* **Endpoint**: `/api/v1/credentials/:id/payload`
* **Authentication**: Required (Permitted only while in `DRAFT` status)
* **Request Body**: `{ "payload": { ... } }`
* **Response `200 OK`**: Updated `Credential` object.

### 4.3 Finalize & Anchor Credential
* **Method**: `POST`
* **Endpoint**: `/api/v1/credentials/:id/finalize`
* **Authentication**: Required (`ISSUER`, `ORGANIZATION_ADMIN`, `SUPER_ADMIN`)
* **Description**:
  1. Computes deterministic SHA-256 canonical hash of the credential payload.
  2. Transitions status from `DRAFT` to `FINALIZED`.
  3. Anchors the 32-byte cryptographic proof on the `CredentialRegistry` smart contract.
  4. Transitions status to `ISSUED` upon transaction receipt.
* **Response `200 OK`**:
  ```json
  {
    "id": "e1216dc9-52b9-4fa8-91bc-ce1ef9c76e8e",
    "credentialNumber": "CC-1724500000-1234",
    "status": "ISSUED",
    "canonicalHash": "3b29c9e8f...",
    "blockchainTxId": "0x789abc...",
    "finalizedAt": "2026-08-25T00:00:00.000Z"
  }
  ```

---

## 5. B.Tech Degree Engine & Academic Chain

### 5.1 Evaluate Degree Eligibility
* **Method**: `GET`
* **Endpoint**: `/api/v1/candidates/:id/degree-eligibility`
* **Authentication**: Optional / Public
* **Response `200 OK`**:
  ```json
  {
    "candidateId": "4a72d4c0-7988-4e1b-b463-c1551608eb82",
    "organizationId": "d74e3089-a292-4161-ba1b-90f75432655d",
    "programType": "BTECH",
    "programName": "B.Tech Computer Science & Engineering",
    "isEligible": true,
    "totalRequiredSemesters": 8,
    "completedSemestersCount": 8,
    "passedSemestersCount": 8,
    "cumulativeGpa": 9.15,
    "totalCreditsEarned": 160,
    "projectedClassification": "FIRST_CLASS_WITH_DISTINCTION",
    "semesters": [
      {
        "semesterNumber": 1,
        "isCompleted": true,
        "isPassed": true,
        "isRevoked": false,
        "isValid": true,
        "semesterGpa": 9.2,
        "credits": 20,
        "credentialId": "...",
        "issues": []
      }
    ],
    "ineligibilityReasons": []
  }
  ```

### 5.2 Issue B.Tech Degree
* **Method**: `POST`
* **Endpoint**: `/api/v1/credentials/degree`
* **Authentication**: Required (`ISSUER`, `ORGANIZATION_ADMIN`, `SUPER_ADMIN`)
* **Request Body**:
  ```json
  {
    "candidateId": "4a72d4c0-7988-4e1b-b463-c1551608eb82",
    "organizationId": "d74e3089-a292-4161-ba1b-90f75432655d",
    "programName": "B.Tech Computer Science & Engineering",
    "degreeTitle": "Bachelor of Technology in Computer Science & Engineering",
    "graduationDate": "2026-06-30"
  }
  ```
* **Response `201 Created`**: Returns issued Degree `Credential` anchored on-chain with constituent prerequisite links.

### 5.3 Credential Relationship DAG
* **Method**: `GET`
* **Endpoint**: `/api/v1/credentials/:id/relationships`
* **Response `200 OK`**: Array of parent/child credential links.

### 5.4 Revoke Credential
* **Method**: `POST`
* **Endpoint**: `/api/v1/credentials/:id/revoke`
* **Authentication**: Required (`ISSUER`, `ORGANIZATION_ADMIN`, `SUPER_ADMIN`)
* **Request Body**:
  ```json
  {
    "reasonCode": "ACADEMIC_MISCONDUCT",
    "note": "Semester 4 marksheet invalidated due to grade alteration."
  }
  ```
* **Response `200 OK`**: Updated `Credential` record with `status: REVOKED`.

---

## 6. Public Verification Portal

### 6.1 Public Cryptographic Verification
* **Method**: `GET`
* **Endpoint**: `/api/v1/credentials/:id/verify`
* **Authentication**: None (Public, Rate Limited to 60 req/min)
* **Response Status Codes & Schemas**:

#### A. Status: `VERIFIED`
```json
{
  "status": "VERIFIED",
  "degreeStatus": "ISSUED",
  "dbHash": "0x3b29c9e8f...",
  "computedHash": "0x3b29c9e8f...",
  "blockchainHash": "0x3b29c9e8f...",
  "issuerAddress": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "degreeDetails": {
    "programName": "B.Tech Computer Science & Engineering",
    "degreeTitle": "Bachelor of Technology",
    "cumulativeGpa": 9.15,
    "totalCreditsEarned": 160,
    "classification": "FIRST_CLASS_WITH_DISTINCTION",
    "totalSemesters": 8
  },
  "chainVerification": {
    "isChainValid": true,
    "totalConstituentSemesters": 8,
    "verifiedSemestersCount": 8,
    "constituentSemesters": [ ... ],
    "chainIssues": []
  }
}
```

#### B. Status: `TAMPERED`
Returned when database operational payload diverges from stored hash or on-chain commitment.
```json
{
  "status": "TAMPERED",
  "degreeStatus": "ISSUED",
  "hashMismatch": true,
  "dbHash": "0x3b29c9...",
  "computedHash": "0x89abcdef...",
  "blockchainHash": "0x3b29c9..."
}
```

#### C. Status: `ISSUED_WITH_REVOKED_PREREQUISITE`
Returned when a degree credential is active on-chain, but one or more underlying prerequisite semester marksheets have been revoked.
```json
{
  "status": "ISSUED_WITH_REVOKED_PREREQUISITE",
  "degreeStatus": "ISSUED",
  "affectedPrerequisites": [
    {
      "semesterNumber": 4,
      "credentialId": "...",
      "credentialNumber": "CC-2024-SEM4",
      "status": "REVOKED",
      "reason": "Prerequisite Semester 4 marksheet has been officially REVOKED"
    }
  ]
}
```

#### D. Status: `UNTRUSTED_ISSUER`
Returned when an on-chain proof exists, but the registering Ethereum address lacks authorized issuer status.

#### E. Status: `REVOKED`
Returned when the credential itself has been revoked.

---

## 7. Metrics & Audit Trail

### 7.1 Dashboard Stats
* **Method**: `GET`
* **Endpoint**: `/api/v1/dashboard/stats`
* **Query Parameters**: `organizationId` (optional)
* **Response `200 OK`**:
  ```json
  {
    "totalCandidates": 42,
    "totalCredentials": 128,
    "issuedCredentials": 115,
    "draftCredentials": 10,
    "revokedCredentials": 3
  }
  ```

### 7.2 Audit Trail Logs
* **Method**: `GET`
* **Endpoint**: `/api/v1/audit-logs`
* **Query Parameters**: `organizationId`, `credentialId`, `candidateId`
* **Response `200 OK`**: Array of sanitized `AuditLog` records.
