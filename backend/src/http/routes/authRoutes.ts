import type { FastifyPluginCallback } from "fastify";
import { z } from "zod";
import type { AuthService } from "../../services/authService.js";
import { badRequest } from "../../errors/apiError.js";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required")
});

const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  displayName: z.string().min(2, "Display name is required"),
  role: z.enum(["SUPER_ADMIN", "ORGANIZATION_ADMIN", "ISSUER", "VERIFIER"]),
  organizationId: z.string().uuid("Invalid organizationId format").optional().nullable()
});

export type AuthRouteOptions = {
  authService: AuthService;
};

export const authRoutes: FastifyPluginCallback<AuthRouteOptions> = (
  app,
  options,
  done
) => {
  const { authService } = options;

  app.post(
    "/api/v1/auth/login",
    {
      config: {
        rateLimit: {
          max: 15,
          timeWindow: "1 minute"
        }
      }
    },
    async (request, reply) => {
      const parseResult = loginSchema.safeParse(request.body);
      if (!parseResult.success) {
        throw badRequest(parseResult.error.issues[0].message);
      }

      const result = await authService.login(parseResult.data);

      reply.setCookie("credchain_token", result.token, {
        path: "/",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 24 * 60 * 60 // 24 hours
      });

      reply.send(result);
    }
  );

  app.post("/api/v1/auth/register", async (request, reply) => {
    const parseResult = registerSchema.safeParse(request.body);
    if (!parseResult.success) {
      throw badRequest(parseResult.error.issues[0].message);
    }

    // Check if caller is authenticated admin
    let creatorContext: { role: "SUPER_ADMIN" | "ORGANIZATION_ADMIN" | "ISSUER" | "VERIFIER"; organizationId?: string | null } | undefined;
    try {
      await app.authenticate(request, reply);
      if (request.user) {
        creatorContext = { role: request.user.role, organizationId: request.user.organizationId };
      }
    } catch {
      // If unauthenticated, only allowed if system has no users or for initial bootstrap
    }

    const result = await authService.register(parseResult.data, creatorContext);
    reply.code(201).send(result);
  });

  app.post("/api/v1/auth/logout", async (_request, reply) => {
    reply.clearCookie("credchain_token", { path: "/" });
    reply.send({ message: "Logged out successfully" });
  });

  app.get("/api/v1/auth/me", { preHandler: [app.authenticate] }, async (request, reply) => {
    const user = await authService.getMe(request.user!.userId);
    reply.send(user);
  });

  done();
};
