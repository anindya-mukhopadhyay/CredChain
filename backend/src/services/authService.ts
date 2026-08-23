import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { UserRepository, User, SafeUser, UserRole } from "../repositories/userRepository.js";
import type { OrganizationRepository } from "../repositories/organizationRepository.js";
import type { AuditRepository } from "../repositories/auditRepository.js";
import { badRequest, notFound, unauthorized } from "../errors/apiError.js";

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  displayName: string;
}

export class AuthService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly auditRepo: AuditRepository,
    private readonly jwtSecret: string
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

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  signToken(payload: AuthTokenPayload): string {
    return jwt.sign(payload, this.jwtSecret, { expiresIn: "24h" });
  }

  verifyToken(token: string): AuthTokenPayload {
    try {
      return jwt.verify(token, this.jwtSecret) as AuthTokenPayload;
    } catch {
      throw unauthorized("Invalid or expired authentication token", "INVALID_TOKEN");
    }
  }

  async login(input: {
    email: string;
    password?: string;
  }): Promise<{ token: string; user: SafeUser }> {
    const user = await this.userRepo.findByEmail(input.email);
    if (!user || !user.isActive) {
      // Generic invalid login to prevent account enumeration
      throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    if (!input.password) {
      throw badRequest("Password is required", "MISSING_PASSWORD");
    }

    const isValid = await this.verifyPassword(input.password, user.passwordHash);
    if (!isValid) {
      if (user.organizationId) {
        await this.auditRepo.create({
          organizationId: user.organizationId,
          actorUserId: user.id,
          entityType: "user",
          entityId: user.id,
          eventType: "USER_LOGIN_FAILED",
          eventMetadata: { email: user.email }
        });
      }
      throw unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    const tokenPayload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      displayName: user.displayName
    };

    const token = this.signToken(tokenPayload);

    if (user.organizationId) {
      await this.auditRepo.create({
        organizationId: user.organizationId,
        actorUserId: user.id,
        entityType: "user",
        entityId: user.id,
        eventType: "USER_LOGGED_IN",
        eventMetadata: { email: user.email, role: user.role }
      });
    }

    return {
      token,
      user: this.toSafeUser(user)
    };
  }

  async register(
    input: {
      email: string;
      password?: string;
      displayName: string;
      role: UserRole;
      organizationId?: string | null;
    },
    creatorContext?: { role: UserRole; organizationId?: string | null }
  ): Promise<{ token: string; user: SafeUser }> {
    // RBAC check on user creation:
    // If not first system user / superadmin provisioning, enforce role permissions
    if (creatorContext) {
      if (creatorContext.role === "ORGANIZATION_ADMIN") {
        if (input.role === "SUPER_ADMIN") {
          throw badRequest("Organization Admin cannot create Super Admin", "FORBIDDEN");
        }
        if (input.organizationId !== creatorContext.organizationId) {
          throw badRequest("Organization Admin can only create users in their own organization", "FORBIDDEN");
        }
      } else if (creatorContext.role !== "SUPER_ADMIN") {
        throw badRequest("Only administrators can provision new users", "FORBIDDEN");
      }
    }

    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw badRequest("A user with this email address already exists", "EMAIL_ALREADY_EXISTS");
    }

    if (input.organizationId) {
      const org = await this.orgRepo.findById(input.organizationId);
      if (!org) throw notFound("Organization");
    }

    const passwordToHash = input.password || "CredChain2026!";
    const passwordHash = await this.hashPassword(passwordToHash);

    const user = await this.userRepo.create({
      email: input.email,
      passwordHash,
      displayName: input.displayName,
      role: input.role,
      organizationId: input.organizationId || null
    });

    if (user.organizationId) {
      await this.auditRepo.create({
        organizationId: user.organizationId,
        actorUserId: user.id,
        entityType: "user",
        entityId: user.id,
        eventType: "USER_CREATED",
        eventMetadata: { email: user.email, role: user.role }
      });
    }

    const tokenPayload: AuthTokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      displayName: user.displayName
    };

    return {
      token: this.signToken(tokenPayload),
      user: this.toSafeUser(user)
    };
  }

  async getMe(userId: string): Promise<SafeUser> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.isActive) throw notFound("User");
    return this.toSafeUser(user);
  }

  async seedDemoUsers(): Promise<void> {
    // Check if Super Admin exists
    const superAdmin = await this.userRepo.findByEmail("superadmin@credchain.com");
    if (!superAdmin) {
      const hash = await this.hashPassword("SuperAdmin2026!");
      await this.userRepo.create({
        email: "superadmin@credchain.com",
        passwordHash: hash,
        displayName: "Super Administrator",
        role: "SUPER_ADMIN",
        organizationId: null
      });
    }

    // Check if demo organization exists
    const orgs = await this.orgRepo.list();
    let demoOrgId: string | null = null;
    if (orgs.length > 0) {
      demoOrgId = orgs[0].id;
    } else {
      const newOrg = await this.orgRepo.create({
        name: "Apex Institute of Technology",
        organizationType: "UNIVERSITY"
      });
      demoOrgId = newOrg.id;
    }

    // Demo Org Admin
    const orgAdmin = await this.userRepo.findByEmail("admin@apex.edu");
    if (!orgAdmin) {
      const hash = await this.hashPassword("ApexAdmin2026!");
      await this.userRepo.create({
        email: "admin@apex.edu",
        passwordHash: hash,
        displayName: "Dean of Academic Affairs",
        role: "ORGANIZATION_ADMIN",
        organizationId: demoOrgId
      });
    }

    // Demo Issuer
    const issuer = await this.userRepo.findByEmail("issuer@apex.edu");
    if (!issuer) {
      const hash = await this.hashPassword("ApexIssuer2026!");
      await this.userRepo.create({
        email: "issuer@apex.edu",
        passwordHash: hash,
        displayName: "Registrar Officer",
        role: "ISSUER",
        organizationId: demoOrgId
      });
    }

    // Demo Verifier
    const verifier = await this.userRepo.findByEmail("verifier@public.org");
    if (!verifier) {
      const hash = await this.hashPassword("Verifier2026!");
      await this.userRepo.create({
        email: "verifier@public.org",
        passwordHash: hash,
        displayName: "Public Background Verifier",
        role: "VERIFIER",
        organizationId: null
      });
    }
  }
}
