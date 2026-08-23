import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import type { CandidateService } from "../../services/candidateService.js";
import { badRequest, notFound } from "../../errors/apiError.js";

const createCandidateSchema = z.object({
  organizationId: z.string().uuid("Invalid organizationId format"),
  candidateReference: z.string().min(1, "candidateReference must not be empty").optional().nullable(),
  name: z.string().min(1, "Name is required").optional(),
  givenName: z.string().min(1, "Given name is required").optional(),
  familyName: z.string().min(1, "Family name is required").optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "dateOfBirth must be YYYY-MM-DD format").optional().nullable(),
  metadata: z.record(z.any()).optional()
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

  app.post("/api/v1/candidates", async (request, reply) => {
    const parseResult = createCandidateSchema.safeParse(request.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw badRequest(issue.message);
    }

    const { organizationId, candidateReference, name, givenName, familyName, dateOfBirth, metadata } = parseResult.data;

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
      metadata
    });

    reply.code(201).send(candidate);
  });

  app.get("/api/v1/candidates", async (request, reply) => {
    const querySchema = z.object({
      organizationId: z.string().uuid().optional()
    });

    const parseResult = querySchema.safeParse(request.query);
    if (!parseResult.success) {
      throw badRequest("Invalid organizationId filter");
    }

    const candidates = await service.list(parseResult.data);
    reply.send(candidates);
  });

  app.get("/api/v1/candidates/:id", async (request, reply) => {
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

    reply.send(candidate);
  });

  done();
};
