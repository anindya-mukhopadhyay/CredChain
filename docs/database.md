# Database Design & Operational Runbook

## Core Principles

PostgreSQL 16 is the authoritative source of operational data. Sensitive identity data, academic course marks, candidate PII, and full credential payloads stay exclusively in PostgreSQL and protected file/object storage—never directly on the public blockchain.

## Schema Architecture & Tables

- `organizations`: Universities, colleges, institutes, companies, and certification bodies.
- `users`: Authenticated user accounts with role-based access control (`SUPER_ADMIN`, `ORGANIZATION_ADMIN`, `ISSUER`, `VERIFIER`).
- `candidates`: Candidate identity records and institutional references.
- `credentials`: Core credential records with status lifecycle (`DRAFT`, `ISSUED`, `REVOKED`), `credential_payload` JSONB, and `canonical_hash`.
- `credential_relationships`: Directional DAG links (`DERIVED_FROM`, `PREREQUISITE_FOR`, `PART_OF`, `REPLACES`) supporting recursive degree verification and tamper propagation.
- `credential_documents`: Off-chain document references and artifact hashes.
- `blockchain_transactions`: On-chain transaction state tracking (`SUBMITTED`, `CONFIRMED`, `FAILED`).
- `audit_logs`: Immutable audit trails for all issuance, revocation, verification, and user management events.
- `revocations`: Revocation reasons, timestamps, and actor references.

## Deterministic Hashing & Storage Model

All finalized credentials undergo deterministic JSON canonicalization (lexicographically sorted keys, standard UTF-8 encoding, zero undefined values) and SHA-256 hashing. The resulting 32-byte hash is recorded in `credentials.canonical_hash` and anchored as the cryptographic commitment on the `CredentialRegistry` smart contract.

## Migration Pipeline

Migrations execute sequentially and atomically within transactions:
- `001_initial_schema.sql`: Core tables, check constraints, foreign keys, and indexes.
- `002_add_credential_payload.sql`: Adds `credential_payload` JSONB with GIN indexing and `finalized_at` timestamp.
- `003_degree_uniqueness.sql`: Adds unique constraint on `(candidate_id, credential_type)` preventing concurrent duplicate degree issuance.

Run migrations:
```bash
npm run db:migrate -w @credchain/backend
```

## Backup & Disaster Recovery Strategy

### 1. Backup Frequency & Retention
- **Production Frequency**: Daily full logical backups via `pg_dump`, continuous write-ahead logging (WAL) archiving for point-in-time recovery (PITR).
- **Retention**: Retain daily backups for 30 days, weekly backups for 90 days, and monthly backups for 1 year in encrypted cloud storage (e.g., GCS / S3 with object lock).

### 2. Backup Execution
Execute the automated backup script:
```bash
DATABASE_URL="postgres://credchain:***@localhost:5432/credchain" ./scripts/db-backup.sh ./backups
```

### 3. Disaster Recovery / Restore Procedure
To restore the database on a clean or recovered instance:
```bash
DATABASE_URL="postgres://credchain:***@localhost:5432/credchain" ./scripts/db-restore.sh ./backups/credchain_backup_YYYYMMDD_HHMMSS.sql.gz
```
Following database restoration, restart the backend service and verify health:
```bash
curl -f http://localhost:4000/health/ready
```
