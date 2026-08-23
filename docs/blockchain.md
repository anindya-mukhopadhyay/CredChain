# Blockchain Design

## Purpose

The blockchain layer provides tamper-evident anchoring and public verification of credential
fingerprints. It does not store raw marks, addresses, phone numbers, email addresses, PDFs, or other
sensitive personal data.

## Current Contract

`CredentialRegistry` supports:

- `registerCredential(bytes32 credentialId, bytes32 documentHash, bytes32 credentialType)`
- `verifyCredential(bytes32 credentialId, bytes32 documentHash)`
- `revokeCredential(bytes32 credentialId, bytes32 reasonCode)`
- `isCredentialValid(bytes32 credentialId)`
- `getCredential(bytes32 credentialId)`
- `addCredentialRelationship(...)`

## Roles

- `DEFAULT_ADMIN_ROLE`: manages contract roles.
- `ISSUER_ROLE`: can register credential proofs and relationships.
- `REVOKER_ROLE`: can revoke active credentials.

## Relationship Types

The generic relationship enum supports:

- `DerivedFrom`
- `PartOf`
- `Supports`
- `PrerequisiteFor`

This can model both academic chains and professional credential dependencies.

## On-Chain Data

The contract stores:

- Credential ID as `bytes32`.
- Document/canonical data hash as `bytes32`.
- Credential type as `bytes32`.
- Issuer address.
- Issue timestamp.
- Active or revoked status.
- Relationship references.

Revocation details should remain off-chain. The contract receives a compact reason code instead of
a free-form reason string to reduce the risk of writing PII on-chain.

## Local Development

Use Hardhat's local network for MVP development:

```bash
npm run node -w @credchain/blockchain
npm run deploy:local -w @credchain/blockchain
```

