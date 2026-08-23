import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import Fastify from "fastify";
import type { FastifyInstance } from "fastify";

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: true
  });

  await app.register(helmet);
  await app.register(cors, {
    origin: true
  });

  app.get("/health", async () => ({
    status: "ok",
    service: "credchain-backend"
  }));

  app.get("/api/v1/system/modules", async () => ({
    modules: [
      "organization-management",
      "candidate-management",
      "credential-management",
      "credential-chain",
      "verification-portal",
      "audit-trail"
    ],
    privacyModel: "sensitive data remains off-chain; blockchain stores hashes and minimal metadata"
  }));

  return app;
}

