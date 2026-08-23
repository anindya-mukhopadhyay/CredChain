# CredChain Security Architecture & Compliance

## 1. Zero-PII Blockchain Model
Never store sensitive personal identification data on-chain.
- **On-Chain Commitment**: Only 32-byte deterministic SHA-256 canonical credential hashes and bytes32 credential ID references are stored on the `CredentialRegistry` smart contract.
- **Off-Chain Isolation**: Candidate names, birth dates, transcripts, marks, and detailed revocation notes reside strictly in PostgreSQL and protected file storage.

## 2. Authentication & Session Management
- **HttpOnly Cookies**: Web client authentication operates exclusively via `credchain_token` `HttpOnly`, `SameSite=Lax`, `Secure` cookies.
- **Zero LocalStorage**: Tokens are never placed in browser `localStorage`, `sessionStorage`, or URL parameters, preventing token theft via Cross-Site Scripting (XSS).
- **Password Security**: Passwords are cryptographically salted and hashed using Bcrypt (10 rounds) in `AuthService`. Plaintext passwords and hashes are never exposed in responses or logs.

## 3. CSRF & State-Changing Request Defense
- **Origin & Sec-Fetch-Site Validation**: Mutating requests (`POST`, `PUT`, `PATCH`, `DELETE`) authenticated via session cookies undergo strict CSRF validation in `authPlugin.ts`, rejecting cross-site submissions with `403 Forbidden` (`CSRF_DETECTED`).

## 4. Role-Based Access Control (RBAC) & Tenant Isolation
Authoritative access control is enforced at the backend service and route layers:
- `SUPER_ADMIN`: Full system-wide visibility and administrative authority.
- `ORGANIZATION_ADMIN`: Administrative rights and user management scoped strictly to their organization.
- `ISSUER`: Can create candidate records, draft credentials, and finalize/revoke credentials within their organization.
- `VERIFIER`: Read-only verification access. Mutating requests are strictly rejected with `403 Forbidden`.
- **Tenant Isolation**: Cross-organization resource access is blocked at the database query and service layer.

## 5. Content-Security-Policy (CSP)
- **Production Posture**: In production builds, `'unsafe-eval'` is **strictly removed**.
- **Hydration Scripts**: `'unsafe-inline'` is retained exclusively for Next.js App Router client-side hydration scripts and Tailwind CSS in the absence of dynamic per-request nonce injection.
- **Header Directives**:
  ```
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  connect-src 'self' <API_URL>;
  ```

## 6. Dependency Vulnerability Analysis
- **Runtime Audit**: Running `npm audit --omit=dev` confirms 2 high-severity findings in Next.js 14.x (Image Optimization and React Server Component deserialization).
- **Remediation Strategy**: Patched to `14.2.35` (eliminating critical advisory GHSA-gp8f-8m3g-qvj9). Complete remediation requires Next.js 15+ (which introduces breaking architectural changes with React 19) and is scheduled for a future framework migration milestone.

## 7. Structured Log Redaction
The backend Fastify logger (Pino) actively redacts sensitive fields across headers and request bodies:
- `req.headers.authorization`
- `req.headers.cookie`
- `req.headers['set-cookie']`
- `body.password`
- `body.token`
- `body.newPassword`
- `*.passwordHash`
- `*.privateKey`
