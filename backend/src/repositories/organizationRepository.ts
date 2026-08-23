import type { DatabaseClient } from "../db/pool.js";

export type OrganizationType =
  | "UNIVERSITY"
  | "COLLEGE"
  | "COMPANY"
  | "CERTIFICATION_PROVIDER"
  | "TRAINING_INSTITUTE"
  | "OTHER";

export type OrganizationVerificationStatus = "PENDING" | "VERIFIED" | "SUSPENDED";

export type Organization = {
  id: string;
  name: string;
  organizationType: OrganizationType;
  verificationStatus: OrganizationVerificationStatus;
  createdAt: string;
  updatedAt: string;
};

type OrganizationRow = {
  id: string;
  name: string;
  organization_type: OrganizationType;
  verification_status: OrganizationVerificationStatus;
  created_at: Date;
  updated_at: Date;
};

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    organizationType: row.organization_type,
    verificationStatus: row.verification_status,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export class OrganizationRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(input: { name: string; organizationType: OrganizationType }): Promise<Organization> {
    const result = await this.database.query<OrganizationRow>(
      `
        INSERT INTO organizations (name, organization_type)
        VALUES ($1, $2)
        RETURNING id, name, organization_type, verification_status, created_at, updated_at
      `,
      [input.name, input.organizationType],
    );

    return mapOrganization(result.rows[0]);
  }

  async findById(id: string): Promise<Organization | null> {
    const result = await this.database.query<OrganizationRow>(
      `
        SELECT id, name, organization_type, verification_status, created_at, updated_at
        FROM organizations
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ? mapOrganization(result.rows[0]) : null;
  }

  async list(): Promise<Organization[]> {
    const result = await this.database.query<OrganizationRow>(
      `
        SELECT id, name, organization_type, verification_status, created_at, updated_at
        FROM organizations
        ORDER BY created_at DESC, name ASC
      `,
    );

    return result.rows.map(mapOrganization);
  }

  async updateStatus(
    id: string,
    verificationStatus: OrganizationVerificationStatus,
  ): Promise<Organization | null> {
    const result = await this.database.query<OrganizationRow>(
      `
        UPDATE organizations
        SET verification_status = $2, updated_at = now()
        WHERE id = $1
        RETURNING id, name, organization_type, verification_status, created_at, updated_at
      `,
      [id, verificationStatus],
    );

    return result.rows[0] ? mapOrganization(result.rows[0]) : null;
  }
}

