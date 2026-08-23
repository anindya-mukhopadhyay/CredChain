# Security Model

## Privacy

Never store the following on-chain:

- Government ID numbers.
- Raw marks or answer-sheet contents.
- Email addresses, phone numbers, addresses, or photographs.
- Full credential PDFs.
- Detailed audit logs or detailed revocation notes.

## Authorization

Credential issuance and revocation require explicit authorization:

- Application roles restrict API access.
- Smart-contract roles restrict on-chain writes.
- Organization scope must be enforced before issuing or revoking credentials.

## Verification

Blockchain presence alone is not enough to call a credential verified. The backend must check:

- Database credential status.
- Revocation status.
- Current canonical hash against stored hash.
- Stored hash against active on-chain proof.
- Issuer and organization authorization.

## Secret Management

Secrets must be loaded from environment variables or a secret manager. Do not hard-code private
keys, database passwords, JWT secrets, RPC credentials, or API keys.

## MVP Hardening Backlog

- Add authentication and password hashing.
- Add rate limits to public verification endpoints.
- Add structured audit logging for every verification and issuance action.
- Add request validation for all APIs.
- Add CI checks for linting, tests, contract compilation, and migration validation.
- Add deployment-specific network allowlists and contract address validation.

