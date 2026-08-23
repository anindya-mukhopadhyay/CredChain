import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import type { UserService } from "../../services/userService.js";
import { badRequest } from "../../errors/apiError.js";

const updateStatusSchema = z.object({
  isActive: z.boolean()
});

const updateRoleSchema = z.object({
  role: z.enum(["SUPER_ADMIN", "ORGANIZATION_ADMIN", "ISSUER", "VERIFIER"])
});

export type UserRouteOptions = {
  userService: UserService;
};

export const userRoutes: FastifyPluginCallback<UserRouteOptions> = (
  app,
  options,
  done
) => {
  const { userService } = options;

  app.get(
    "/api/v1/users",
    { preHandler: [app.requireRole(["SUPER_ADMIN", "ORGANIZATION_ADMIN"])] },
    async (request, reply) => {
      const user = request.user!;
      const users = await userService.list({
        organizationId: user.organizationId || undefined,
        userId: user.userId,
        role: user.role
      });
      reply.send(users);
    }
  );

  app.patch(
    "/api/v1/users/:id/status",
    { preHandler: [app.requireRole(["SUPER_ADMIN", "ORGANIZATION_ADMIN"])] },
    async (request, reply) => {
      const idParamSchema = z.object({
        id: z.string().uuid("Invalid user ID format")
      });

      const parseResultId = idParamSchema.safeParse(request.params);
      if (!parseResultId.success) {
        throw badRequest(parseResultId.error.issues[0].message);
      }

      const parseResultBody = updateStatusSchema.safeParse(request.body);
      if (!parseResultBody.success) {
        throw badRequest(parseResultBody.error.issues[0].message);
      }

      const user = request.user!;
      const updated = await userService.updateStatus(
        parseResultId.data.id,
        parseResultBody.data.isActive,
        {
          organizationId: user.organizationId || undefined,
          userId: user.userId,
          role: user.role
        }
      );

      reply.send(updated);
    }
  );

  app.patch(
    "/api/v1/users/:id/role",
    { preHandler: [app.requireRole(["SUPER_ADMIN", "ORGANIZATION_ADMIN"])] },
    async (request, reply) => {
      const idParamSchema = z.object({
        id: z.string().uuid("Invalid user ID format")
      });

      const parseResultId = idParamSchema.safeParse(request.params);
      if (!parseResultId.success) {
        throw badRequest(parseResultId.error.issues[0].message);
      }

      const parseResultBody = updateRoleSchema.safeParse(request.body);
      if (!parseResultBody.success) {
        throw badRequest(parseResultBody.error.issues[0].message);
      }

      const user = request.user!;
      const updated = await userService.updateRole(
        parseResultId.data.id,
        parseResultBody.data.role,
        {
          organizationId: user.organizationId || undefined,
          userId: user.userId,
          role: user.role
        }
      );

      reply.send(updated);
    }
  );

  done();
};
