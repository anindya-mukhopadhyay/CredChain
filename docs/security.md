# CredChain Security Architecture & Compliance

## 1. Zero-PII Blockchain Model
CredChain enforces a zero-PII policy for all blockchain interactions:
- **On-Chain Commitments**: Only 32-byte deterministic SHA-256 canonical credential hashes and `bytes32` credential ID references are stored on the `CredentialRegistry` smart contract.
- **Off-Chain Isolation**: Candidate names, birth dates, transcripts, marks, and detailed revocation notes reside strictly in PostgreSQL and protected file storage.
- **GDPR & Privacy Compliance**: Because student personal data is never stored on the public blockchain, student records can be updated or archived in accordance with privacy regulations without compromising on-chain ledger integrity.

---

## 2. Authentication & Session Security
- **HttpOnly Session Cookies**: Web client authentication operates exclusively via `credchain_token` `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- **Zero LocalStorage Token Storage**: Authentication tokens are never placed in browser `localStorage`, `sessionStorage`, or URL parameters, mitigating token theft via Cross-Site Scripting (XSS).
- **Cryptographic Password Hashing**: Passwords are salted and hashed using Bcrypt (10 rounds) in `AuthService`. Plaintext passwords and password hashes are never exposed in responses or structured logs.
- **Generic Authentication Failures**: Login failures return generic `"Invalid email or password"` responses to prevent account enumeration.

---

## 3. CSRF & State-Changing Request Defense
- **Origin & Sec-Fetch-Site Validation**: Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) authenticated via session cookies undergo strict CSRF validation in `authPlugin.ts`, rejecting cross-site submissions with `403 Forbidden` (`CSRF_DETECTED`).

---

## 4. Role-Based Access Control (RBAC) & Multi-Tenant Isolation
Authoritative access control is enforced at the backend service and route layers:
- `SUPER_ADMIN`: Full system-wide visibility and administrative authority.
- `ORGANIZATION_ADMIN`: Administrative rights and user provisioning scoped strictly to their own organization.
- `ISSUER`: Can create candidate records, draft credentials, and finalize/revoke credentials within their organization.
- `VERIFIER`: Read-only verification access. Mutating requests are strictly rejected with `403 Forbidden`.
- **Tenant Isolation**: Cross-organization resource access is blocked at the database query and service layer. Organization IDs in JWT tokens strictly dictate data access.

---

## 5. Structured Log Redaction
The backend Fastify logger (Pino) actively redacts sensitive fields across headers and request bodies:
* `req.headers.authorization`
* `req.headers.cookie`
* `req.headers['set-cookie']`
* `body.password`
* `body.token`
* `body.newPassword`
* `*.passwordHash`
* `*.privateKey`

---

## 6. Accurate Security Terminology & Claims
CredChain adheres to precise, factual security terminology:
* **Tamper-Evident**: Any alteration to off-chain academic records is immediately detected when comparing canonical hashes against on-chain commitments.
* **Cryptographically Verifiable**: Anyone can independently verify that a credential's canonical hash matches the proof signed by an authorized university issuer on the smart contract.
* **Zero-PII Blockchain Proof**: No student personally identifiable information is recorded on the public ledger.
* **No Unsupported Claims**: CredChain does **not** claim to be "100% fraud-proof", "absolutely immutable database", or "government certified" unless explicitly accredited by relevant statutory bodies.

---

## 7. Dependency Security Analysis
* Running `npm audit --omit=dev` confirms 2 high-severity advisories internal to Next.js 14.x (Image Optimization and React Server Component deserialization).
* **Remediation Posture**: Next.js is patched to the latest `14.2.35` release. Full resolution requires upgrading to Next.js 15+ (which requires React 19 and breaking framework migrations), scheduled for a future framework lifecycle milestone.
