# Database Design

## Principle

PostgreSQL is the source of operational credential data. Sensitive data stays here or in controlled
document storage, never directly on a public blockchain.

## Initial Tables

- `organizations`: universities, colleges, companies, certification providers, and training
  institutes.
- `users`: role-bearing application users.
- `candidates`: internal candidate/student/employee records.
- `credentials`: generic credential records.
- `credential_relationships`: links such as `DERIVED_FROM` and `PART_OF`.
- `semester_results`: academic stage details for the B.Tech demo.
- `credential_documents`: off-chain generated documents and hashes.
- `blockchain_transactions`: submitted and confirmed transaction references.
- `audit_logs`: application-level events.
- `revocations`: off-chain revocation details.

## Hashing Model

Finalized credential data is represented as deterministic canonical JSON and hashed with SHA-256.
The resulting hash is stored in `credentials.canonical_hash` and registered on-chain as the document
proof.

## Migration Strategy

The backend includes a small migration runner that applies ordered SQL files and records them in
`schema_migrations`. 

Currently applied migrations:
- `database/migrations/001_initial_schema.sql`: Sets up all core entities, check constraints, and indexes.
- `database/migrations/002_add_credential_payload.sql`: Alters `credentials` to add the `credential_payload` JSONB column (with GIN index for search optimization) and the `finalized_at` timestamp.

