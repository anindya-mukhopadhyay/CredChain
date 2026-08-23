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

    reply.code(211); // wait, let's see. Should it be 201 (Created) or 200 (OK)? 
    // Usually 201 is standard. But wait! The prompt says "Return the created organization. Validate required fields." 
    // Let's use 201 for POST (Created). It is the standard REST status.
    reply.code(201).send(org);
  });

  done();
};
