import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import type { CredentialService } from "../../services/credentialService.js";
import { badRequest, notFound } from "../../errors/apiError.js";

const createCredentialSchema = z.object({
  organizationId: z.string().uuid("Invalid organizationId format"),
  candidateId: z.string().uuid("Invalid candidateId format"),
  credentialType: z.string().min(1, "credentialType is required"),
  credentialNumber: z.string().min(1).optional(),
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expiryDate must be YYYY-MM-DD format").optional().nullable(),
  payload: z.record(z.any()).default({})
});

const updatePayloadSchema = z.object({
  payload: z.record(z.any())
});

const revokeCredentialSchema = z.object({
  reasonCode: z.string().min(1, "reasonCode is required"),
  note: z.string().optional()
});

export type CredentialRouteOptions = {
  service: CredentialService;
};

export const credentialRoutes: FastifyPluginCallback<CredentialRouteOptions> = (
  app,
  options,
  done
) => {
  const { service } = options;

  app.post("/api/v1/credentials", async (request, reply) => {
    const parseResult = createCredentialSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw badRequest(parseResult.error.issues[0].message);
    }

    const data = parseResult.data;
    const credentialNumber = data.credentialNumber || `CC-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const cred = await service.createDraft({
      credentialNumber,
      credentialType: data.credentialType,
      candidateId: data.candidateId,
      organizationId: data.organizationId,
      expiryDate: data.expiryDate,
      credentialPayload: data.payload
    });

    reply.code(201).send(cred);
  });

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

    const updated = await service.updateDraftPayload(
      parseResultId.data.id,
      parseResultBody.data.payload
    );

    reply.send(updated);
  });

  app.post("/api/v1/credentials/:id/finalize", async (request, reply) => {
    const idParamSchema = z.object({
      id: z.string().uuid("Invalid credential ID format")
    });

    const parseResult = idParamSchema.safeParse(request.params);
    if (!parseResult.success) {
      throw badRequest(parseResult.error.issues[0].message);
    }

    const finalized = await service.finalize(parseResult.data.id);
    reply.send(finalized);
  });

  app.get("/api/v1/credentials/:id/verify", async (request, reply) => {
    const idParamSchema = z.object({
      id: z.string().uuid("Invalid credential ID format")
    });

    const parseResult = idParamSchema.safeParse(request.params);
    if (!parseResult.success) {
      throw badRequest(parseResult.error.issues[0].message);
    }

    const result = await service.verify(parseResult.data.id);
    reply.send(result);
  });

  app.post("/api/v1/credentials/:id/revoke", async (request, reply) => {
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

    const revoked = await service.revoke(
      parseResultId.data.id,
      parseResultBody.data.reasonCode,
      parseResultBody.data.note
    );

    reply.send(revoked);
  });

  done();
};
