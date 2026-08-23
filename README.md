# CredChain

CredChain is a blockchain-backed credential verification MVP. It keeps sensitive academic,
employment, and personal data off-chain while anchoring cryptographic proofs on an EVM-compatible
blockchain for tamper-evident verification.

## Problem Statement

Academic and professional credentials are easy to alter after issuance and difficult for third
parties to verify independently. CredChain addresses this by combining a secure off-chain
application database with on-chain credential fingerprints, issuer authorization, revocation, and
relationship tracking.

## Solution

CredChain stores candidate profiles, semester results, credential documents, audit logs, and other
sensitive application data in PostgreSQL and controlled storage. For finalized credentials, the
backend generates a deterministic canonical representation, hashes it with SHA-256, and registers
only the proof and minimal metadata on-chain.

The blockchain record is not a claim that the original information is true. It is a durable proof
that a credential fingerprint was issued by an authorized issuer at a point in time and has not
changed since anchoring.

## Architecture

```text
frontend/
backend/
blockchain/
database/
docs/
```

- `frontend`: planned Next.js verification portal and organization dashboard.
- `backend`: TypeScript Fastify API, hashing logic, database integration, blockchain integration.
- `blockchain`: Hardhat project containing Solidity contracts and tests.
- `database`: PostgreSQL migrations.
- `docs`: architecture, blockchain, database, and security notes.

## Data Flow

```text
Organization
  -> Candidate
  -> Semester or credential record
  -> Canonical credential JSON
  -> SHA-256 hash
  -> Smart contract proof
  -> Verification portal
```

Verification compares the current off-chain canonical hash against the stored database hash and
the on-chain proof. A credential is not shown as verified unless both checks pass and the credential
has not been revoked.

## Privacy Model

Do not write personally identifiable or sensitive data to public blockchain storage. This includes
raw marks, addresses, phone numbers, email addresses, ID numbers, student photos, answer sheets, and
full PDFs. QR codes should contain only a credential ID or verification URL.

## Technology Choices

- Node.js and TypeScript for backend services.
- Fastify for the API foundation.
- PostgreSQL for normalized off-chain data.
- Hardhat, Solidity, Ethers.js, and OpenZeppelin for blockchain development.
- SHA-256 for deterministic off-chain credential fingerprints.
- Next.js, TypeScript, and Tailwind CSS planned for the frontend phase.

## Local Setup

Install dependencies:

```bash
npm install
```

Copy environment variables:

```bash
cp .env.example .env
```

Start PostgreSQL:

```bash
docker compose up -d postgres
```

Run database migrations:

```bash
npm run db:migrate -w @credchain/backend
```

Compile smart contracts:

```bash
npm run compile -w @credchain/blockchain
```

Run smart-contract tests:

```bash
npm run test -w @credchain/blockchain
```

Run backend tests:

```bash
npm run test -w @credchain/backend
```

Start a local Hardhat node:

```bash
npm run node -w @credchain/blockchain
```

Deploy locally in another terminal:

```bash
npm run deploy:local -w @credchain/blockchain
```

Start the backend:

```bash
npm run dev -w @credchain/backend
```

## Environment Variables

See `.env.example` for the first required variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `RPC_URL`
- `CHAIN_ID`
- `CREDENTIAL_REGISTRY_ADDRESS`
- `DOCUMENT_STORAGE_ROOT`

Never commit real secrets, private keys, production database passwords, or API keys.

## Demo Workflow Target

The first MVP flow is:

```text
Create organization
  -> create candidate
  -> create semester 1 result
  -> finalize result
  -> hash canonical credential
  -> register proof on local blockchain
  -> verify unchanged credential
  -> demonstrate tamper mismatch
```

The planned B.Tech scenario extends this to:

```text
S1 -> S2 -> S3 -> S4 -> S5 -> S6 -> S7 -> S8 -> Degree
```

## Current Status

This repository currently contains the Phase 1 foundation:

- Monorepo structure.
- Backend TypeScript service skeleton.
- Deterministic credential canonicalization and hashing utility.
- PostgreSQL initial migration.
- Hardhat Solidity development environment.
- Initial `CredentialRegistry` contract and tests.
- Architecture, blockchain, database, and security documentation.

## Future Improvements

- Authentication and role-aware API authorization.
- Full credential issuance and verification APIs.
- Document generation and QR verification.
- Frontend dashboard and public verification portal.
- Demo seed data for a fictional B.Tech student and a company credential issuer.
- CI workflow for linting, tests, and smart-contract checks.

