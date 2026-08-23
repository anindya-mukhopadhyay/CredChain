# CredChain Architecture

## Goals

CredChain is designed as a modular MVP that proves tamper-evident credential verification without
putting sensitive data on-chain.

The first production-shaped flow is:

```text
Organization -> Candidate -> Credential -> Canonical hash -> Blockchain proof -> Verification
```

## Boundaries

- The frontend renders dashboards, credential details, QR-based verification, and audit history.
- The backend owns authentication, authorization, canonicalization, database writes, blockchain
  transactions, and verification decisions.
- PostgreSQL stores sensitive and operational data off-chain.
- The blockchain stores credential IDs, document hashes, issuer identity, status, revocation state,
  and credential relationships.

## Backend Modules

- `config`: Environment validation and runtime settings.
- `db`: PostgreSQL connection, pooling, and migration runner.
- `domain/credentials`: Canonical credential representations, JSON sorting, and SHA-256 hashing.
- `http`: Fastify API server, Zod route validations, global error handlers, and route handlers.
- `repositories`: Abstracted PostgreSQL CRUD database access layer.
- `services`: Business logic services encapsulating database transactions and blockchain client anchoring.

## Verification Decision

A credential can be shown as verified only when:

- The credential exists in the database.
- The credential is not revoked.
- The current canonical representation hashes to the stored database hash.
- The same hash is active in the smart contract.
- The issuer is authorized for the organization and credential type.

## Extensibility

The data model avoids university-only assumptions. A B.Tech semester marksheet, company training
certificate, internship certificate, and professional credential all use the same credential
foundation with optional domain-specific detail tables.

