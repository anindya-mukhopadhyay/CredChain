# CredChain — Production Deployment & Operations Guide

## 1. System Architecture & Boundaries

```
                                  Internet
                                     │
                          TLS / Reverse Proxy (Nginx)
                                     │
                     ┌───────────────┴───────────────┐
                     ▼                               ▼
        Next.js Frontend (:3000)            Fastify API (:4000)
        (Static & React Components)                  │
                                         ┌───────────┴───────────┐
                                         ▼                       ▼
                                   PostgreSQL 16          EVM Blockchain RPC
                                   (Off-Chain Data)      (CredentialRegistry)
```

---

## 2. Environment Configurations: Local vs. Production

### Development Environment
* **Blockchain**: Local Hardhat node running on `http://127.0.0.1:8545` (Chain ID `31337`).
* **Database**: Local PostgreSQL instance (`localhost:5432`).
* **Security**: Development JWT secret and demo user auto-seeding enabled (`ENABLE_DEMO_SEED=true`).
* **Frontend CSP**: Allows `'unsafe-eval'` for webpack/HMR hot-reloading.

### Production / Testnet Environment
* **Blockchain**: Public/Private EVM network (e.g. Sepolia testnet or Polygon/Ethereum mainnet) via high-availability RPC endpoints (Infura, Alchemy, QuickNode).
* **Database**: Managed PostgreSQL 16 (e.g. AWS RDS, GCP Cloud SQL) with TLS/SSL enforced.
* **Security**: Cryptographically generated 32+ character `JWT_SECRET`. Automatic demo seeding is strictly disabled.
* **Frontend CSP**: **Strictly eliminates `'unsafe-eval'`**. Retains `'unsafe-inline'` for Next.js App Router hydration and styling.
* **Safety Guards**: In `backend/src/config/env.ts`, startup automatically aborts if placeholder secrets or missing contract addresses are detected when `NODE_ENV=production`.

---

## 3. Blockchain State Machine & Failure Handling

### State Transitions
1. `DRAFT`: Credential created locally with draft payload. Zero on-chain presence.
2. `FINALIZING / PENDING`: Off-chain canonical SHA-256 hash computed. Transaction submitted to EVM mempool.
3. `CONFIRMED`: Blockchain transaction receipt confirmed on-chain. Database updates `blockchain_tx_id` and status to `ISSUED`.
4. `FAILED`: If RPC times out, reverts, or fails, the transaction is marked `FAILED` in `blockchain_transactions`. The credential status remains unconfirmed, preventing false verification claims.

### RPC Failure Semantics
* **Unreachable RPC**: `BlockchainService.checkReadiness()` returns `isReady: false`.
* **Readiness Probe (`GET /health/ready`)**: Returns `503 Service Unavailable` with `status: not_ready, blockchain: unavailable`.
* **Verification Safety**: When blockchain proof cannot be fetched or verified, `CredentialVerificationService` marks verification as incomplete/pending—it **never** falsely reports `VERIFIED`.

---

## 4. Production Release Checklist (v1.0.0)

- [ ] Smart contract deployed to target network and verified on block explorer.
- [ ] `CREDENTIAL_REGISTRY_ADDRESS` and `RPC_URL` configured in backend environment.
- [ ] PostgreSQL 16 database provisioned with encrypted storage and automated backups.
- [ ] All sequential database migrations executed (`001_initial_schema.sql`, `002_academic_pipeline.sql`, `003_auth_and_rbac.sql`).
- [ ] Cryptographically random 32+ char `JWT_SECRET` generated and secured in secret manager.
- [ ] `ENABLE_DEMO_SEED=false` and `NODE_ENV=production` verified in production `.env`.
- [ ] TLS certificate installed on reverse proxy with HTTP to HTTPS redirect.
- [ ] Rate limiting verified on public `/api/v1/credentials/:id/verify` endpoint.
- [ ] Health probes `/health` and `/health/ready` integrated into container orchestrator.

---

## 5. Step-by-Step Deployment Runbook

### Step 1: Smart Contract Deployment (Blockchain)
1. Configure `RPC_URL` and `DEPLOYER_PRIVATE_KEY` in environment or secret manager.
2. Deploy `CredentialRegistry` to target EVM network:
   ```bash
   npm run deploy:contract -w @credchain/blockchain
   ```
3. Record the deployed contract address and configure `CREDENTIAL_REGISTRY_ADDRESS` in backend environment.

### Step 2: Database Provisioning & Migrations (PostgreSQL)
1. Ensure PostgreSQL 16 is running with SSL enabled for production.
2. Execute sequential database migrations:
   ```bash
   npm run db:migrate -w @credchain/backend
   ```

### Step 3: Fastify Backend API Deployment
1. Build backend TypeScript source:
   ```bash
   npm run build -w @credchain/backend
   ```
2. Start server in production mode with PM2 / systemd / Docker:
   ```bash
   NODE_ENV=production npm run start -w @credchain/backend
   ```
3. Verify readiness probe:
   ```bash
   curl -f http://localhost:4000/health/ready
   ```

### Step 4: Next.js Frontend Deployment
1. Build optimized production bundle:
   ```bash
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com npm run build -w @credchain/frontend
   ```
2. Start frontend server:
   ```bash
   NODE_ENV=production npm run start -w @credchain/frontend
   ```

---

## 6. Reverse Proxy Configuration (Nginx Example)

```nginx
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=20r/s;

server {
    listen 443 ssl http2;
    server_name credchain.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/credchain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/credchain/privkey.pem;

    # API Reverse Proxy
    location /api/ {
        limit_req zone=api_limit burst=50 nodelay;
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Health Checks (No rate limiting)
    location /health {
        proxy_pass http://127.0.0.1:4000/health;
    }

    # Frontend Next.js Web App
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
