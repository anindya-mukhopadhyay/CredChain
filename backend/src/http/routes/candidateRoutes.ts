import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import { z } from "zod";
import type { CandidateService } from "../../services/candidateService.js";
import { badRequest, notFound, forbidden, ApiError } from "../../errors/apiError.js";
import type { JsonObject } from "../../domain/credentials/types.js";

const createCandidateSchema = z.object({
  organizationId: z.string().uuid("Invalid organizationId format"),
  candidateReference: z.string().min(1, "candidateReference must not be empty").optional().nullable(),
  name: z.string().min(1, "Name is required").optional(),
  givenName: z.string().min(1, "Given name is required").optional(),
  familyName: z.string().min(1, "Family name is required").optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateOfBirth must be YYYY-MM-DD format").optional().nullable(),
  metadata: z.record(z.unknown()).optional()
});

export type CandidateRouteOptions = {
  service: CandidateService;
};

export const candidateRoutes: FastifyPluginCallback<CandidateRouteOptions> = (
  app,
  options,
  done
) => {
  const { service } = options;

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

  app.post("/api/v1/candidates", async (request, reply) => {
    await tryAuthenticate(request);
    const parseResult = createCandidateSchema.safeParse(request.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw badRequest(issue.message);
    }

    const { organizationId, candidateReference, name, givenName, familyName, dateOfBirth, metadata } = parseResult.data;

    if (request.user) {
      if (request.user.role === "VERIFIER") {
        throw forbidden("Forbidden: Verifiers cannot register candidates", "FORBIDDEN");
      }
      if (request.user.role !== "SUPER_ADMIN" && request.user.organizationId !== organizationId) {
        throw forbidden("Forbidden: Cannot create candidate for another organization", "FORBIDDEN");
      }
    }

    let finalGivenName = givenName || "";
    let finalFamilyName = familyName || "";

    if (!finalGivenName && name) {
      const parts = name.trim().split(/\s+/);
      finalGivenName = parts[0];
      finalFamilyName = parts.slice(1).join(" ") || "-";
    }

    if (!finalGivenName) {
      throw badRequest("givenName or name is required");
    }

    const candidate = await service.create({
      organizationId,
      externalReference: candidateReference,
      givenName: finalGivenName,
      familyName: finalFamilyName,
      dateOfBirth,
      metadata: metadata as JsonObject | undefined
    });

    reply.code(201).send(candidate);
  });

  app.get("/api/v1/candidates", async (request, reply) => {
    await tryAuthenticate(request);
    const querySchema = z.object({
      organizationId: z.string().uuid().optional()
    });

    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      throw badRequest("Invalid organizationId filter");
    }

    let filterOrgId = parseResult.data.organizationId;
    if (request.user && request.user.role !== "SUPER_ADMIN" && request.user.organizationId) {
      filterOrgId = request.user.organizationId;
    }

    const candidates = await service.list({ organizationId: filterOrgId });
    reply.send(candidates);
  });

  app.get("/api/v1/candidates/:id", async (request, reply) => {
    await tryAuthenticate(request);
    const paramsSchema = z.object({
      id: z.string().uuid("Invalid candidate ID format")
    });

    const parseResult = paramsSchema.safeParse(request.params);
    if (!parseResult.success) {
      throw badRequest(parseResult.error.issues[0].message);
    }

    const candidate = await service.findById(parseResult.data.id);
    if (!candidate) {
      throw notFound("Candidate");
    }

    if (request.user && request.user.role !== "SUPER_ADMIN" && request.user.organizationId) {
      if (candidate.organizationId !== request.user.organizationId) {
        throw forbidden("Forbidden: Candidate belongs to another organization", "FORBIDDEN");
      }
    }

    reply.send(candidate);
  });

  done();
};
