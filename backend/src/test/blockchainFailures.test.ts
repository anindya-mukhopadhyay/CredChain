import { describe, it, expect } from "vitest";
import { BlockchainService } from "../services/blockchain/blockchainService.js";
import { buildApp } from "../http/app.js";
import { loadEnv } from "../config/env.js";
import type { DatabaseClient } from "../db/pool.js";

describe("CredChain Phase 6.2: Blockchain Failure & Production Safety Tests", () => {
  describe("1. Blockchain RPC Failure Handling", () => {
    it("reports blockchain as unavailable when RPC endpoint is unreachable", async () => {
      // Connect to unreachable RPC port
      const brokenService = new BlockchainService("http://127.0.0.1:59999", "0x5FbDB2315678afecb367f032d93F642f64180aa3");
      const readiness = await brokenService.checkReadiness();

      expect(readiness.isReady).toBe(false);
      expect(readiness.error).toBeDefined();
    });

    it("marks /health and /health/ready as degraded/503 when blockchain RPC is down", async () => {
      const mockDb: DatabaseClient = {
        query: async () => ({ rows: [] } as unknown as import("pg").QueryResult)
      };
      const brokenBlockchain = new BlockchainService("http://127.0.0.1:59999", "0x5FbDB2315678afecb367f032d93F642f64180aa3");

      const app = await buildApp({
        database: mockDb,
        blockchainService: brokenBlockchain
      });

      const healthRes = await app.inject({ method: "GET", url: "/health" });
      expect(healthRes.statusCode).toBe(503);
      const healthBody = JSON.parse(healthRes.body);
      expect(healthBody.status).toBe("degraded");
      expect(healthBody.blockchain).toBe("unavailable");

      const readyRes = await app.inject({ method: "GET", url: "/health/ready" });
      expect(readyRes.statusCode).toBe(503);
      const readyBody = JSON.parse(readyRes.body);
      expect(readyBody.status).toBe("not_ready");
      expect(readyBody.blockchain).toBe("unavailable");
    });
  });

  describe("2. Invalid Contract Address Handling", () => {
    it("fails safely when unconfigured or non-contract address is called", async () => {
      const unconfiguredService = new BlockchainService();
      await expect(unconfiguredService.getCredential("test-id")).rejects.toThrow("Blockchain contract address is not configured");
    });
  });

  describe("3. Production Environment Safety Assertions", () => {
    it("rejects default development JWT_SECRET when NODE_ENV=production", () => {
      expect(() => {
        loadEnv({
          NODE_ENV: "production",
          DATABASE_URL: "postgres://credchain:pass@prod-db.internal:5432/credchain",
          JWT_SECRET: "local-development-jwt-secret-change-before-production",
          CREDENTIAL_REGISTRY_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
          DEPLOYER_PRIVATE_KEY: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        });
      }).toThrow("Production requires a unique, non-placeholder cryptographic JWT_SECRET");
    });

    it("rejects missing CREDENTIAL_REGISTRY_ADDRESS when NODE_ENV=production", () => {
      expect(() => {
        loadEnv({
          NODE_ENV: "production",
          DATABASE_URL: "postgres://credchain:pass@prod-db.internal:5432/credchain",
          JWT_SECRET: "a-very-secure-32-character-random-production-secret-value",
          DEPLOYER_PRIVATE_KEY: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
        });
      }).toThrow("Production requires a valid 42-character hex CREDENTIAL_REGISTRY_ADDRESS");
    });

    it("rejects missing DEPLOYER_PRIVATE_KEY when NODE_ENV=production", () => {
      expect(() => {
        loadEnv({
          NODE_ENV: "production",
          DATABASE_URL: "postgres://credchain:pass@prod-db.internal:5432/credchain",
          JWT_SECRET: "a-very-secure-32-character-random-production-secret-value",
          CREDENTIAL_REGISTRY_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
        });
      }).toThrow("Production requires a valid 66-character hex DEPLOYER_PRIVATE_KEY");
    });

    it("accepts valid production configuration", () => {
      const validProd = loadEnv({
        NODE_ENV: "production",
        DATABASE_URL: "postgres://credchain:pass@prod-db.internal:5432/credchain",
        JWT_SECRET: "a-very-secure-32-character-random-production-secret-value",
        CREDENTIAL_REGISTRY_ADDRESS: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        DEPLOYER_PRIVATE_KEY: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80"
      });
      expect(validProd.NODE_ENV).toBe("production");
    });
  });
});
