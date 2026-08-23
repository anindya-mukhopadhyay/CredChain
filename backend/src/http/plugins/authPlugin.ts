import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type { AuthService, AuthTokenPayload } from "../../services/authService.js";
import type { UserRole } from "../../repositories/userRepository.js";
import { forbidden, unauthorized } from "../../errors/apiError.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AuthTokenPayload;
    authMethod?: "BEARER" | "COOKIE";
  }
  interface FastifyInstance {
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    requireRole: (roles: UserRole[]) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

export type AuthPluginOptions = {
  authService: AuthService;
};

const authPluginCallback: FastifyPluginCallback<AuthPluginOptions> = (
  app,
  options,
  done
) => {
  const { authService } = options;

  const authenticate = async (request: FastifyRequest) => {
    let token: string | undefined;
    let authMethod: "BEARER" | "COOKIE" = "BEARER";

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.slice(7).trim();
      authMethod = "BEARER";
    } else if (request.cookies && request.cookies.credchain_token) {
      token = request.cookies.credchain_token;
      authMethod = "COOKIE";
    }

    if (!token) {
      throw unauthorized("Authentication required", "UNAUTHORIZED");
    }

    // CSRF Protection for Cookie-based state-changing requests
    if (authMethod === "COOKIE" && ["POST", "PUT", "PATCH", "DELETE"].includes(request.method)) {
      const secFetchSite = request.headers["sec-fetch-site"];
      const origin = request.headers.origin;
      const host = request.headers.host;

      if (secFetchSite && secFetchSite === "cross-site") {
        throw forbidden("Cross-site request blocked by CSRF protection", "CSRF_DETECTED");
      }

      if (origin && host) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host && !originHost.startsWith("localhost:") && !host.startsWith("localhost:")) {
            throw forbidden("Origin mismatch blocked by CSRF protection", "CSRF_DETECTED");
          }
        } catch {
          // Invalid origin header
        }
      }
    }

    const payload = authService.verifyToken(token);
    request.user = payload;
    request.authMethod = authMethod;
  };

  const requireRole = (roles: UserRole[]) => {
    return async (request: FastifyRequest) => {
      await authenticate(request);
      if (!request.user) {
        throw unauthorized("Authentication required", "UNAUTHORIZED");
      }
      if (!roles.includes(request.user.role)) {
        throw forbidden("Forbidden: Insufficient permissions for this operation", "FORBIDDEN");
      }
    };
  };

  app.decorate("authenticate", authenticate);
  app.decorate("requireRole", requireRole);

  done();
};

export const authPlugin = fp(authPluginCallback, {
  name: "authPlugin"
});
