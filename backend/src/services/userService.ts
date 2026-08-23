import type { UserRepository, User, SafeUser, UserRole } from "../repositories/userRepository.js";
import type { AuditRepository } from "../repositories/auditRepository.js";
import { badRequest, notFound } from "../errors/apiError.js";
import type { ActorContext } from "./credentialService.js";

export class UserService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly auditRepo: AuditRepository
  ) {}

  toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      organizationId: user.organizationId,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };
  }

  async list(actorContext: ActorContext & { role?: UserRole }): Promise<SafeUser[]> {
    if (actorContext.role === "SUPER_ADMIN") {
      const users = await this.userRepo.listByOrganization();
      return users.map((u) => this.toSafeUser(u));
    }

    if (!actorContext.organizationId) {
      return [];
    }

    const users = await this.userRepo.listByOrganization(actorContext.organizationId);
    return users.map((u) => this.toSafeUser(u));
  }

  async updateStatus(
    id: string,
    isActive: boolean,
    actorContext: ActorContext & { role?: UserRole }
  ): Promise<SafeUser> {
    const targetUser = await this.userRepo.findById(id);
    if (!targetUser) throw notFound("User");

    // Enforce organization isolation
    if (actorContext.role !== "SUPER_ADMIN") {
      if (targetUser.organizationId !== actorContext.organizationId) {
        throw badRequest("Forbidden: User belongs to a different organization", "FORBIDDEN");
      }
      if (actorContext.role !== "ORGANIZATION_ADMIN") {
        throw badRequest("Forbidden: Insufficient permissions", "FORBIDDEN");
      }
    }

    const updated = await this.userRepo.updateStatus(id, isActive);
    if (!updated) throw notFound("User");

    if (updated.organizationId) {
      await this.auditRepo.create({
        organizationId: updated.organizationId,
        actorUserId: actorContext.userId || null,
        entityType: "user",
        entityId: id,
        eventType: "USER_STATUS_UPDATED",
        eventMetadata: { isActive }
      });
    }

    return this.toSafeUser(updated);
  }

  async updateRole(
    id: string,
    newRole: UserRole,
    actorContext: ActorContext & { role?: UserRole }
  ): Promise<SafeUser> {
    const targetUser = await this.userRepo.findById(id);
    if (!targetUser) throw notFound("User");

    // Enforce organization isolation
    if (actorContext.role !== "SUPER_ADMIN") {
      if (targetUser.organizationId !== actorContext.organizationId) {
        throw badRequest("Forbidden: User belongs to a different organization", "FORBIDDEN");
      }
      if (actorContext.role !== "ORGANIZATION_ADMIN") {
        throw badRequest("Forbidden: Insufficient permissions", "FORBIDDEN");
      }
      if (newRole === "SUPER_ADMIN") {
        throw badRequest("Organization Admin cannot assign Super Admin role", "FORBIDDEN");
      }
    }

    const updated = await this.userRepo.updateRole(id, newRole);
    if (!updated) throw notFound("User");

    if (updated.organizationId) {
      await this.auditRepo.create({
        organizationId: updated.organizationId,
        actorUserId: actorContext.userId || null,
        entityType: "user",
        entityId: id,
        eventType: "USER_ROLE_UPDATED",
        eventMetadata: { oldRole: targetUser.role, newRole }
      });
    }

    return this.toSafeUser(updated);
  }
}
