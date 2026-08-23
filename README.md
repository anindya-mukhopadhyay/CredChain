# CredChain

CredChain is an enterprise-grade academic credential chain and verification platform. It maintains complete candidate confidentiality by keeping sensitive identity records, course marks, and degree transcripts strictly off-chain in PostgreSQL while anchoring tamper-evident cryptographic proofs on an EVM-compatible blockchain.

---

## Key Capabilities

* **Academic Credential Chain**: 8-semester B.Tech academic pipeline with prerequisite tracking, CGPA calculation, and academic classification.
* **Degree Eligibility Engine & Issuance**: Automated evaluation of all 8 semesters with concurrency protection against duplicate degree issuance.
* **Recursive Multi-Layer Verification**: Verification engine recursively audits prerequisite chains, detecting tamper propagation or revoked prerequisites.
* **Zero-PII Blockchain Proofs**: Only deterministic 32-byte SHA-256 canonical hashes are anchored on the `CredentialRegistry` smart contract.
* **Security & Authentication**:
  * Salted Bcrypt password hashing (10 rounds).
  * `HttpOnly`, `SameSite=Lax`, `Secure` cookie session management (zero `localStorage` token storage).
  * CSRF defense for state-changing requests.
  * Role-Based Access Control (`SUPER_ADMIN`, `ORGANIZATION_ADMIN`, `ISSUER`, `VERIFIER`) and multi-tenant organization isolation.
* **QR Verification & Sharing**: Clean, zero-PII QR code generator and modal for instant public verification.
* **Production Observability**: Fastify structured logging with sensitive field redaction, liveness (`/health/live`), and readiness (`/health/ready`) probes.

---

## Architecture Overview

```
                                  Client Browser
                                        ↓
                           TLS / Reverse Proxy (Nginx)
                                        ↓
                        ┌───────────────┴───────────────┐
                        ↓                               ↓
           Next.js Frontend (:3000)            Fastify API (:4000)
           (Interactive Dashboard & UI)                 ↓
                                            ┌───────────┴───────────┐
                                            ↓                       ↓
                                      PostgreSQL 16          EVM Blockchain RPC
                                      (Off-Chain Data)      (CredentialRegistry)
```

---

## Monorepo Structure

```text
├── backend/          # Fastify + TypeScript REST API, Repositories, Domain Services
├── frontend/         # Next.js 14 (App Router), React, Tailwind CSS, Lucide Icons
├── blockchain/       # Hardhat, Solidity 0.8.24 (CredentialRegistry), Ethers.js v6
├── database/         # PostgreSQL sequential SQL migrations (001, 002, 003)
├── scripts/          # Operational backup & disaster recovery scripts
└── docs/             # Architecture, Database, Blockchain, Security, & Deployment guides
```

---

## Local Development Quick Start

### 1. Prerequisites
* Node.js >= 20.x
* Docker & Docker Compose (for PostgreSQL)

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

### 4. Start PostgreSQL & Run Migrations
```bash
docker compose up -d postgres
npm run db:migrate -w @credchain/backend
```

### 5. Start Local Blockchain Node & Deploy Contract
```bash
# Terminal 1: Start local node
npm run node -w @credchain/blockchain

# Terminal 2: Deploy CredentialRegistry contract
npm run deploy:contract -w @credchain/blockchain
```

### 6. Start Backend & Frontend
```bash
# Terminal 3: Start Fastify API
npm run dev -w @credchain/backend

# Terminal 4: Start Next.js Frontend
npm run dev -w @credchain/frontend
```
Access the application at `http://localhost:3000`.

---

## Production Verification Suite

Execute the full 4-step monorepo validation matrix:

```bash
# 1. Run all unit & integration tests (Backend, Blockchain, Frontend)
npm run test

# 2. Run TypeScript typechecking
npm run typecheck -w @credchain/backend && npm run typecheck -w @credchain/frontend

# 3. Run ESLint code quality checks
npm run lint -w @credchain/backend && npm run lint -w @credchain/frontend

# 4. Build production bundles
npm run build -w @credchain/backend && npm run build -w @credchain/frontend
```

---

## Operations & Disaster Recovery

* **Database Backup**:
  ```bash
  DATABASE_URL="postgres://..." ./scripts/db-backup.sh ./backups
  ```
* **Database Restore**:
  ```bash
  DATABASE_URL="postgres://..." ./scripts/db-restore.sh ./backups/credchain_backup_YYYYMMDD_HHMMSS.sql.gz
  ```
* **Readiness Health Check**:
  ```bash
  curl -f http://localhost:4000/health/ready
  ```
