import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import type { OrganizationService } from "../../services/organizationService.js";
import { badRequest } from "../../errors/apiError.js";

const createOrganizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  type: z.enum([
    "UNIVERSITY",
    "COLLEGE",
    "COMPANY",
    "CERTIFICATION_PROVIDER",
    "TRAINING_INSTITUTE",
    "OTHER"
  ], {
    errorMap: () => ({ message: "Invalid organization type" })
  })
});

export type OrganizationRouteOptions = {
  service: OrganizationService;
};

export const organizationRoutes: FastifyPluginCallback<OrganizationRouteOptions> = (
  app,
  options,
  done
) => {
  const { service } = options;

  app.post("/api/v1/organizations", async (request, reply) => {
    const parseResult = createOrganizationSchema.safeParse(request.body);
    if (!parseResult.success) {
      const issue = parseResult.error.issues[0];
      throw badRequest(issue.message);
    }

    const org = await service.create({
      name: parseResult.data.name,
      organizationType: parseResult.data.type
    });

    reply.code(201).send(org);
  });

  app.get("/api/v1/organizations", async (_request, reply) => {
    const orgs = await service.list();
    reply.send(orgs);
  });

  done();
};
