import Fastify, { type FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { loadEnv } from "../config/env.js";
import { verifyDatabaseConnection, type DatabaseClient, type TransactionalDatabase } from "../db/pool.js";
import { ApiError } from "../errors/apiError.js";

// Repositories
import { OrganizationRepository } from "../repositories/organizationRepository.js";
import { CandidateRepository } from "../repositories/candidateRepository.js";
import { CredentialRepository } from "../repositories/credentialRepository.js";
import { AuditRepository } from "../repositories/auditRepository.js";
import { UserRepository } from "../repositories/userRepository.js";

// Services
import { OrganizationService } from "../services/organizationService.js";
import { CandidateService } from "../services/candidateService.js";
import { CredentialService } from "../services/credentialService.js";
import { AuthService } from "../services/authService.js";
import { UserService } from "../services/userService.js";
import { BlockchainService } from "../services/blockchain/blockchainService.js";

// Plugins & Routes
import { authPlugin } from "./plugins/authPlugin.js";
import { authRoutes } from "./routes/authRoutes.js";
import { userRoutes } from "./routes/userRoutes.js";
import { organizationRoutes } from "./routes/organizationRoutes.js";
import { candidateRoutes } from "./routes/candidateRoutes.js";
import { credentialRoutes } from "./routes/credentialRoutes.js";

type BuildAppOptions = {
  database?: DatabaseClient;
  blockchainService?: BlockchainService;
};

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const env = loadEnv();

  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || (env.NODE_ENV === "production" ? "info" : "debug"),
      redact: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers['set-cookie']",
        "body.password",
        "body.token",
        "body.newPassword",
        "*.passwordHash",
        "*.privateKey"
      ]
    }
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: true,
    credentials: true
  });
  await app.register(cookie);
  await app.register(rateLimit, {
    global: false
  });

  // Global Error Handler
  app.setErrorHandler((error: Error & { statusCode?: number; code?: string }, _request, reply) => {
    if (error instanceof ApiError) {
      reply.code(error.statusCode).send({
        error: error.code,
        message: error.message
      });
    } else {
      app.log.error(error);
      const isInternal = !error.statusCode || error.statusCode >= 500;
      const isProd = env.NODE_ENV === "production";
      reply.code(error.statusCode || 500).send({
        error: "INTERNAL_SERVER_ERROR",
        message: (isInternal && isProd) ? "An unexpected internal server error occurred" : (error.message || "An unexpected error occurred")
      });
    }
  });

  // Initialize or accept Blockchain Service
  const blockchainService = options.blockchainService ?? (
    env.CREDENTIAL_REGISTRY_ADDRESS
      ? new BlockchainService(env.RPC_URL, env.CREDENTIAL_REGISTRY_ADDRESS, env.DEPLOYER_PRIVATE_KEY)
      : undefined
  );

  app.get("/health/live", async () => ({
    status: "alive",
    timestamp: new Date().toISOString()
  }));

  app.get("/health", async (_request, reply) => {
    let dbStatus = "not_configured";
    if (options.database) {
      try {
        await verifyDatabaseConnection(options.database);
        dbStatus = "connected";
      } catch {
        dbStatus = "unavailable";
      }
    }

    let blockchainStatus = "not_configured";
    if (blockchainService) {
      const bcReady = await blockchainService.checkReadiness();
      blockchainStatus = bcReady.isReady ? "connected" : "unavailable";
    }

    const isHealthy = dbStatus !== "unavailable" && blockchainStatus !== "unavailable";
    if (!isHealthy) {
      reply.code(503);
    }

    return {
      status: isHealthy ? "ok" : "degraded",
      service: "credchain-backend",
      database: dbStatus,
      blockchain: blockchainStatus,
      environment: env.NODE_ENV
    };
  });

  app.get("/health/ready", async (_request, reply) => {
    if (!options.database) {
      reply.code(503);
      return { status: "not_ready", reason: "Database not configured" };
    }

    try {
      await verifyDatabaseConnection(options.database);
    } catch {
      reply.code(503);
      return {
        status: "not_ready",
        database: "unavailable"
      };
    }

    if (blockchainService) {
      const bcReady = await blockchainService.checkReadiness();
      if (!bcReady.isReady) {
        reply.code(503);
        return {
          status: "not_ready",
          database: "connected",
          blockchain: "unavailable"
        };
      }
    }

    return {
      status: "ready",
      database: "connected",
      blockchain: blockchainService ? "connected" : "not_configured",
      timestamp: new Date().toISOString()
    };
  });

  app.get("/api/v1/system/modules", async () => ({
    modules: [
      "organization-management",
      "candidate-management",
      "credential-management",
      "credential-chain",
      "verification-portal",
      "audit-trail",
      "authentication",
      "rbac",
      "qr-verification"
    ],
    privacyModel: "sensitive data remains off-chain; blockchain stores hashes and minimal metadata"
  }));

  if (options.database) {
    // Instantiate Repositories
    const orgRepo = new OrganizationRepository(options.database);
    const candidateRepo = new CandidateRepository(options.database);
    const credentialRepo = new CredentialRepository(options.database);
    const auditRepo = new AuditRepository(options.database);
    const userRepo = new UserRepository(options.database);

    // Instantiate Services
    const orgService = new OrganizationService(orgRepo);
    const candidateService = new CandidateService(candidateRepo);
    const authService = new AuthService(userRepo, orgRepo, auditRepo, env.JWT_SECRET);
    const userService = new UserService(userRepo, auditRepo);

    // Seed demo accounts only in non-production environments or when explicitly enabled
    if (env.NODE_ENV !== "production" || env.ENABLE_DEMO_SEED) {
      try {
        await authService.seedDemoUsers();
      } catch (seedErr) {
        app.log.warn(`Demo user seeding note: ${(seedErr as Error).message}`);
      }
    }

    const credentialService = new CredentialService(
      options.database as unknown as TransactionalDatabase,
      credentialRepo,
      orgRepo,
      candidateRepo,
      auditRepo,
      blockchainService
    );

    // Register Auth Plugin
    await app.register(authPlugin, { authService });

    // Register Routes
    await app.register(authRoutes, { authService });
    await app.register(userRoutes, { userService });
    await app.register(organizationRoutes, { service: orgService });
    await app.register(candidateRoutes, { service: candidateService });
    await app.register(credentialRoutes, { service: credentialService });
  }

  return app;
}
