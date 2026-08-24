# CredChain — Blockchain-Backed Academic Credential Verification Platform

CredChain is an enterprise-grade academic credential platform that connects multi-semester academic records and B.Tech degree transcripts to tamper-evident cryptographic commitments and blockchain-backed provenance.

CredChain maintains complete candidate confidentiality by keeping sensitive identity records, course marks, and degree transcripts strictly off-chain in PostgreSQL while anchoring deterministic 32-byte cryptographic commitments on an EVM-compatible smart contract (`CredentialRegistry`).

---

## Why CredChain?

Traditional academic credential verification suffers from severe systemic vulnerabilities:
1. **Pervasive Document Forgery**: PDFs and paper certificates are easily forged using graphic editing tools.
2. **Centralized Database Vulnerability**: Rogue insiders or database breaches can silently alter grades, marks, and degrees without an auditable trail.
3. **Slow Verification Lifecycles**: Employers and background checkers wait weeks for manual registrar verification.
4. **Privacy vs Verification Trade-Offs**: Naive blockchain implementations expose candidate PII on public ledgers, violating GDPR and data privacy laws.

**CredChain solves this** by decoupling sensitive record storage (off-chain in PostgreSQL) from tamper verification (on-chain cryptographic commitments), enabling instant public verification with zero PII exposure.

---

## Key Capabilities

* **8-Semester Academic Chain**: Full undergraduate B.Tech progression pipeline tracking course modules, credits, grades, and automated SGPA/CGPA calculations.
* **Degree Eligibility Engine**: Automated validation across all 8 semesters ensuring complete passing grades before degree issuance.
* **Recursive Multi-Layer Verification**: The verification portal audits the entire DAG prerequisite chain, instantly flagging tampered marksheets or revoked prerequisites (`ISSUED_WITH_REVOKED_PREREQUISITE`).
* **Zero-PII Blockchain Proofs**: Only deterministic 32-byte SHA-256 canonical hashes are anchored on the `CredentialRegistry` smart contract.
* **Institutional Role-Based Access Control (RBAC)**: Strict separation of privileges (`SUPER_ADMIN`, `ORGANIZATION_ADMIN`, `ISSUER`, `VERIFIER`) with multi-tenant organization isolation.
* **Secure Session Architecture**: Authentication operates exclusively via `HttpOnly`, `SameSite=Lax`, `Secure` session cookies with CSRF defense. Tokens are never stored in browser `localStorage`.
* **Zero-PII QR Code Sharing**: Instant public verification via QR code sharing, link copying, or direct credential lookup.
* **Production Observability**: Pino structured log redaction, liveness (`/health/live`), and readiness (`/health/ready`) probes verifying database and blockchain connectivity.

---

## Architecture

```
                                  Client Browser
                                        │
                            TLS / Reverse Proxy (Nginx)
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
            Next.js Frontend (:3000)          Fastify API (:4000)
            (App Router, Tailwind CSS)                 │
                                                       │ (Services & Repositories)
                                          ┌────────────┴────────────┐
                                          ▼                         ▼
                                    PostgreSQL 16          EVM Blockchain RPC
                                  (Off-Chain Data)        (CredentialRegistry)
```

### Academic Credential DAG & Verification Pipeline

```
  Semester 1 Marksheet (Canonical SHA-256) ──► Registered on Blockchain Proof
  Semester 2 Marksheet (Canonical SHA-256) ──► Registered on Blockchain Proof
                       ...
  Semester 8 Marksheet (Canonical SHA-256) ──► Registered on Blockchain Proof
                         │
                         ▼
        Automated Degree Eligibility Engine (CGPA >= 5.0, All 8 Passed)
                         │
                         ▼
       B.Tech Degree Certificate (Cryptographic Commitment Root)
                         │
                         ▼
              Public Verification Portal
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   [VERIFIED]       [TAMPERED]       [REVOKED / PREREQ REVOKED]
```

---

## Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend API** | Fastify, TypeScript, Node.js | High-throughput REST API, Zod schema validation |
| **Database** | PostgreSQL 16, pg pool | Off-chain sensitive records, multi-tenant schemas |
| **Smart Contracts** | Solidity 0.8.24, Hardhat, Ethers.js v6 | `CredentialRegistry` cryptographic proof anchoring |
| **Frontend UI** | Next.js 14 (App Router), React 18, Tailwind CSS | Enterprise dashboard, degree hub, verification portal |
| **Security** | Bcrypt (10 rounds), JWT, HttpOnly Cookies | Password hashing, stateless session management, CSRF defense |
| **QR Code Engine** | node-qrcode, HTML5 Canvas | Zero-PII client-side QR generation and PNG download |

---

## Local Development Quick Start

### 1. Prerequisites
* Node.js >= 20.x
* PostgreSQL 16 (or Docker Compose)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
```

### 4. Start PostgreSQL & Run Database Migrations
```bash
# Start PostgreSQL via Docker Compose
docker compose up -d postgres

# Run database schema migrations
npm run db:migrate -w @credchain/backend
```

### 5. Start Local Blockchain Node & Deploy Contract
```bash
# Terminal 1: Start local Hardhat blockchain node
npm run node -w @credchain/blockchain

# Terminal 2: Deploy CredentialRegistry smart contract to localhost
npm run deploy:local -w @credchain/blockchain
```

### 6. Start Backend & Frontend Services
```bash
# Terminal 3: Start Fastify Backend API (Port 4000)
npm run dev -w @credchain/backend

# Terminal 4: Start Next.js Frontend (Port 3000)
npm run dev -w @credchain/frontend
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Demo Accounts

When running in development mode, the system pre-seeds the following demo accounts:

| Role | Email | Password | Scope |
|---|---|---|---|
| **University Admin** | `admin@apex.edu` | `ApexAdmin2026!` | Apex Institute of Technology |
| **Registrar Issuer** | `issuer@apex.edu` | `ApexIssuer2026!` | Apex Institute of Technology |
| **Public Verifier** | `verifier@public.org` | `Verifier2026!` | Public / Verification Only |
| **Super Admin** | `superadmin@credchain.com` | `SuperAdmin2026!` | System-wide Global Admin |

---

## Verification & Testing Suite

Execute the complete 4-step monorepo validation matrix:

```bash
# 1. Run all unit and integration tests across all workspaces
npm run test

# 2. Run TypeScript typechecking across all workspaces
npm run typecheck

# 3. Run ESLint code quality checks
npm run lint

# 4. Compile production builds
npm run build
```

---

## Documentation Index

* [**REST API Reference**](docs/api.md): Complete endpoint documentation with request/response schemas.
* [**Architecture Specification**](docs/architecture.md): Service boundaries, DAG commitments, and verification decisions.
* [**Security Architecture**](docs/security.md): Zero-PII model, authentication, CSRF, RBAC, and log redaction.
* [**Live Demonstration Script**](docs/demo-script.md): Step-by-step walkthrough for local demonstration and tampering tests.
* [**Production Deployment Guide**](docs/production-deployment.md): Deployment checklist, Docker Compose, environment configuration, and SSL.
