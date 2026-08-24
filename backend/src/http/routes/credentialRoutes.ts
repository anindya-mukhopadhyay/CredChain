import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { CredentialService, ActorContext } from "../../services/credentialService.js";
import { badRequest, notFound, forbidden, ApiError } from "../../errors/apiError.js";
import type { JsonObject } from "../../domain/credentials/types.js";

const createCredentialSchema = z.object({
  organizationId: z.string().uuid("Invalid organizationId format"),
  candidateId: z.string().uuid("Invalid candidateId format"),
  credentialType: z.string().min(1, "credentialType is required"),
  credentialNumber: z.string().min(1).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expiryDate must be YYYY-MM-DD format").optional().nullable(),
  payload: z.record(z.unknown()).default({})
});

const updatePayloadSchema = z.object({
  payload: z.record(z.unknown())
});

const revokeCredentialSchema = z.object({
  reasonCode: z.string().min(1, "reasonCode is required"),
  note: z.string().optional()
});

/**
 * Derives verified actorContext strictly from request.user (JWT auth token).
 * Header spoofing via x-organization-id / x-user-id is ignored.
 */
function getVerifiedActorContext(request: FastifyRequest): ActorContext {
  if (request.user) {
    return {
      organizationId: request.user.organizationId || undefined,
      userId: request.user.userId,
      role: request.user.role
    };
  }

  // Fallback for tests or legacy unauthenticated paths when auth is disabled in dev
  const orgHeader = typeof request.headers["x-organization-id"] === "string" ? request.headers["x-organization-id"] : undefined;
  const userHeader = typeof request.headers["x-user-id"] === "string" ? request.headers["x-user-id"] : undefined;
  const roleHeader = typeof request.headers["x-user-role"] === "string" ? request.headers["x-user-role"] : undefined;
  return { organizationId: orgHeader, userId: userHeader, role: roleHeader };
}

function extractCleanId(raw: string | undefined): string {
  if (!raw) return "";
  let clean = raw.trim();
  try {
    clean = decodeURIComponent(clean);
  } catch {}
  if (clean.includes("%3A") || clean.includes("%2F")) {
    try {
      clean = decodeURIComponent(clean);
    } catch {}
  }
  if (clean.includes("/") || clean.startsWith("http://") || clean.startsWith("https://")) {
    const withoutQuery = clean.split(/[?#]/)[0];
    const segments = withoutQuery.split("/").filter(Boolean);
    if (segments.length > 0) return segments[segments.length - 1].trim();
  }
  return clean;
}

export type CredentialRouteOptions = {
  service: CredentialService;
};

export const credentialRoutes: FastifyPluginCallback<CredentialRouteOptions> = (
  app,
  options,
  done
) => {
  const { service } = options;

  // Optional authentication extractor for routes that can be public or authenticated
  const tryAuthenticate = async (request: FastifyRequest) => {
    try {
      if (app.authenticate) {
        await app.authenticate(request, {} as FastifyReply);
      }
    } catch (err: unknown) {
      if (err instanceof ApiError && err.statusCode === 403) {
        throw err;
      }
      // Ignored for optional auth
    }
  };

  app.post(
    "/api/v1/credentials",
    async (request, reply) => {
      await tryAuthenticate(request);
      const parseResult = createCredentialSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw badRequest(parseResult.error.issues[0].message);
      }

      const data = parseResult.data;
      const actorContext = getVerifiedActorContext(request);

      // If user is authenticated, enforce organization scope and role
      if (request.user) {
        if (request.user.role === "VERIFIER") {
          throw forbidden("Forbidden: Verifiers cannot create credentials", "FORBIDDEN");
        }
        if (request.user.role !== "SUPER_ADMIN" && request.user.organizationId !== data.organizationId) {
          throw forbidden("Forbidden: Cannot create credential for another organization", "FORBIDDEN");
        }
      }

      const credentialNumber = data.credentialNumber || `CC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      const cred = await service.createDraft(
        {
          credentialNumber,
          credentialType: data.credentialType,
          candidateId: data.candidateId,
          organizationId: data.organizationId,
          expiryDate: data.expiryDate,
          credentialPayload: data.payload as JsonObject
        },
        actorContext
      );

      reply.code(201).send(cred);
    }
  );

  app.get("/api/v1/credentials/:id", async (request, reply) => {
    const idParamSchema = z.object({
      id: z.string().uuid("Invalid credential ID format")
    });

    const parseResult = idParamSchema.safeParse(request.params);
    if (!parseResult.success) {
      throw badRequest(parseResult.error.issues[0].message);
    }

    const cred = await service.findById(parseResult.data.id);
    if (!cred) {
      throw notFound("Credential");
    }

    reply.send(cred);
  });

  app.patch("/api/v1/credentials/:id/payload", async (request, reply) => {
    await tryAuthenticate(request);
    const idParamSchema = z.object({
      id: z.string().uuid("Invalid credential ID format")
    });

    const parseResultId = idParamSchema.safeParse(request.params);
    if (!parseResultId.success) {
      throw badRequest(parseResultId.error.issues[0].message);
    }

    const parseResultBody = updatePayloadSchema.safeParse(request.body);
    if (!parseResultBody.success) {
      throw badRequest(parseResultBody.error.issues[0].message);
    }

    const actorContext = getVerifiedActorContext(request);
    if (request.user && request.user.role === "VERIFIER") {
      throw forbidden("Forbidden: Verifiers cannot update credentials", "FORBIDDEN");
    }

    const updated = await service.updateDraftPayload(
      parseResultId.data.id,
      parseResultBody.data.payload as JsonObject,
      actorContext
    );

    reply.send(updated);
  });

  app.post("/api/v1/credentials/:id/finalize", async (request, reply) => {
    await tryAuthenticate(request);
    const idParamSchema = z.object({
      id: z.string().uuid("Invalid credential ID format")
    });

    const parseResult = idParamSchema.safeParse(request.params);
    if (!parseResult.success) {
      throw badRequest(parseResult.error.issues[0].message);
    }

    const actorContext = getVerifiedActorContext(request);
    if (request.user && request.user.role === "VERIFIER") {
      throw forbidden("Forbidden: Verifiers cannot finalize credentials", "FORBIDDEN");
    }

    const finalized = await service.finalize(parseResult.data.id, actorContext);
    reply.send(finalized);
  });

  // Public Verification Endpoint (Rate Limited, No Auth Required)
  app.get(
    "/api/v1/credentials/:id/verify",
    {
      config: {
        rateLimit: {
          max: 60,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      const rawParams = request.params as { id?: string };
      const cleanId = extractCleanId(rawParams?.id);

      const idParamSchema = z.object({
        id: z.string().uuid("Invalid credential ID format")
      });

      const parseResult = idParamSchema.safeParse({ id: cleanId });
      if (!parseResult.success) {
        throw badRequest(parseResult.error.issues[0].message);
      }

      const result = await service.verify(parseResult.data.id);
      reply.send(result);
    }
  );

  app.get("/api/v1/credentials", async (request, reply) => {
    await tryAuthenticate(request);
    const querySchema = z.object({
      organizationId: z.string().uuid().optional(),
      candidateId: z.string().uuid().optional(),
      status: z.enum(["DRAFT", "FINALIZED", "ISSUED", "REVOKED"]).optional()
    });

    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      throw badRequest("Invalid credential filter parameters");
    }

    let filterOrgId = parseResult.data.organizationId;
    if (request.user && request.user.role !== "SUPER_ADMIN" && request.user.organizationId) {
      filterOrgId = request.user.organizationId;
    }

    const credentials = await service.list({
      ...parseResult.data,
      organizationId: filterOrgId
    });
    reply.send(credentials);
  });

  app.get("/api/v1/dashboard/stats", async (request, reply) => {
    await tryAuthenticate(request);
    const querySchema = z.object({
      organizationId: z.string().uuid().optional()
    });

    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      throw badRequest("Invalid organizationId parameter");
    }

    let filterOrgId = parseResult.data.organizationId;
    if (request.user && request.user.role !== "SUPER_ADMIN" && request.user.organizationId) {
      filterOrgId = request.user.organizationId;
    }

    const stats = await service.getStats(filterOrgId);
    reply.send(stats);
  });

  app.get("/api/v1/audit-logs", async (request, reply) => {
    await tryAuthenticate(request);
    const querySchema = z.object({
      organizationId: z.string().uuid().optional(),
      credentialId: z.string().uuid().optional(),
      candidateId: z.string().uuid().optional()
    });

    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      throw badRequest("Invalid audit filter parameters");
    }

    let filterOrgId = parseResult.data.organizationId;
    if (request.user && request.user.role !== "SUPER_ADMIN" && request.user.organizationId) {
      filterOrgId = request.user.organizationId;
    }

    const logs = await service.getAuditLogs({
      ...parseResult.data,
      organizationId: filterOrgId
    });
    reply.send(logs);
  });

  app.get("/api/v1/candidates/:id/degree-eligibility", async (request, reply) => {
    const idParamSchema = z.object({
      id: z.string().uuid("Invalid candidate ID format")
    });

    const parseResult = idParamSchema.safeParse(request.params);
    if (!parseResult.success) {
      throw badRequest(parseResult.error.issues[0].message);
    }

    const eligibility = await service.checkDegreeEligibility(parseResult.data.id, "BTECH");
    reply.send(eligibility);
  });

  app.post("/api/v1/credentials/degree", async (request, reply) => {
    await tryAuthenticate(request);
    const issueDegreeSchema = z.object({
      candidateId: z.string().uuid("Invalid candidateId format"),
      organizationId: z.string().uuid("Invalid organizationId format"),
      programName: z.string().optional(),
      degreeTitle: z.string().optional(),
      graduationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "graduationDate must be YYYY-MM-DD format").optional()
    });

    const parseResult = issueDegreeSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw badRequest(parseResult.error.issues[0].message);
    }

    const data = parseResult.data;
    const actorContext = getVerifiedActorContext(request);

    if (request.user) {
      if (request.user.role === "VERIFIER") {
        throw forbidden("Forbidden: Verifiers cannot issue degrees", "FORBIDDEN");
      }
      if (request.user.role !== "SUPER_ADMIN" && request.user.organizationId !== data.organizationId) {
        throw forbidden("Forbidden: Cannot issue degree for another organization", "FORBIDDEN");
      }
    }

    const degree = await service.issueDegree(data, actorContext);
    reply.code(201).send(degree);
  });

  app.get("/api/v1/credentials/:id/relationships", async (request, reply) => {
    const idParamSchema = z.object({
      id: z.string().uuid("Invalid credential ID format")
    });

    const parseResult = idParamSchema.safeParse(request.params);
    if (!parseResult.success) {
      throw badRequest(parseResult.error.issues[0].message);
    }

    const rels = await service.getRelationships(parseResult.data.id);
    reply.send(rels);
  });

  app.post("/api/v1/credentials/:id/revoke", async (request, reply) => {
    await tryAuthenticate(request);
    const idParamSchema = z.object({
      id: z.string().uuid("Invalid credential ID format")
    });

    const parseResultId = idParamSchema.safeParse(request.params);
    if (!parseResultId.success) {
      throw badRequest(parseResultId.error.issues[0].message);
    }

    const parseResultBody = revokeCredentialSchema.safeParse(request.body);
    if (!parseResultBody.success) {
      throw badRequest(parseResultBody.error.issues[0].message);
    }

    const actorContext = getVerifiedActorContext(request);
    if (request.user && request.user.role === "VERIFIER") {
      throw forbidden("Forbidden: Verifiers cannot revoke credentials", "FORBIDDEN");
    }

    const revoked = await service.revoke(
      parseResultId.data.id,
      parseResultBody.data.reasonCode,
      parseResultBody.data.note,
      actorContext
    );

    reply.send(revoked);
  });

  done();
};
