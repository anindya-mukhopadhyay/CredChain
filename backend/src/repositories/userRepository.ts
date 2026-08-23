import type { DatabaseClient } from "../db/pool.js";

export type UserRole = "SUPER_ADMIN" | "ORGANIZATION_ADMIN" | "ISSUER" | "VERIFIER";

export interface User {
  id: string;
  organizationId: string | null;
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SafeUser = Omit<User, "passwordHash">;

export class UserRepository {
  constructor(private readonly db: DatabaseClient) {}

  private mapRow(row: Record<string, unknown>): User {
    return {
      id: row.id as string,
      organizationId: (row.organization_id as string) || null,
      email: row.email as string,
      passwordHash: row.password_hash as string,
      displayName: row.display_name as string,
      role: row.role as UserRole,
      isActive: Boolean(row.is_active),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string)
    };
  }

  async findById(id: string): Promise<User | null> {
    const res = await this.db.query("SELECT * FROM users WHERE id = $1", [id]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async findByEmail(email: string): Promise<User | null> {
    const res = await this.db.query("SELECT * FROM users WHERE LOWER(email) = LOWER($1)", [email.trim()]);
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async create(data: {
    email: string;
    passwordHash: string;
    displayName: string;
    role: UserRole;
    organizationId?: string | null;
  }): Promise<User> {
    const res = await this.db.query(
      `
        INSERT INTO users (email, password_hash, display_name, role, organization_id, is_active)
        VALUES (LOWER($1), $2, $3, $4, $5, true)
        RETURNING *
      `,
      [data.email.trim(), data.passwordHash, data.displayName.trim(), data.role, data.organizationId || null]
    );
    return this.mapRow(res.rows[0]);
  }

  async listByOrganization(organizationId?: string): Promise<User[]> {
    if (organizationId) {
      const res = await this.db.query(
        "SELECT * FROM users WHERE organization_id = $1 ORDER BY created_at DESC",
        [organizationId]
      );
      return res.rows.map((r) => this.mapRow(r));
    }

    const res = await this.db.query("SELECT * FROM users ORDER BY created_at DESC");
    return res.rows.map((r) => this.mapRow(r));
  }

  async updateStatus(id: string, isActive: boolean): Promise<User | null> {
    const res = await this.db.query(
      `
        UPDATE users
        SET is_active = $2, updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [id, isActive]
    );
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }

  async updateRole(id: string, role: UserRole): Promise<User | null> {
    const res = await this.db.query(
      `
        UPDATE users
        SET role = $2, updated_at = now()
        WHERE id = $1
        RETURNING *
      `,
      [id, role]
    );
    if (res.rows.length === 0) return null;
    return this.mapRow(res.rows[0]);
  }
}
