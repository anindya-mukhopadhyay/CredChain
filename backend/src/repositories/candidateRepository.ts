import type { DatabaseClient } from "../db/pool.js";
import type { JsonObject } from "../domain/credentials/types.js";

export type Candidate = {
  id: string;
  organizationId: string;
  externalReference: string | null;
  givenName: string;
  familyName: string;
  dateOfBirth: string | null;
  metadata: JsonObject;
  createdAt: string;
  updatedAt: string;
};

type CandidateRow = {
  id: string;
  organization_id: string;
  external_reference: string | null;
  given_name: string;
  family_name: string;
  date_of_birth: Date | string | null;
  metadata: JsonObject;
  created_at: Date;
  updated_at: Date;
};

function mapDateOnly(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return value;
}

function mapCandidate(row: CandidateRow): Candidate {
  return {
    id: row.id,
    organizationId: row.organization_id,
    externalReference: row.external_reference,
    givenName: row.given_name,
    familyName: row.family_name,
    dateOfBirth: mapDateOnly(row.date_of_birth),
    metadata: row.metadata,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

export class CandidateRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(input: {
    organizationId: string;
    externalReference?: string | null;
    givenName: string;
    familyName: string;
    dateOfBirth?: string | null;
    metadata?: JsonObject;
  }): Promise<Candidate> {
    const result = await this.database.query<CandidateRow>(
      `
        INSERT INTO candidates (
          organization_id,
          external_reference,
          given_name,
          family_name,
          date_of_birth,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, organization_id, external_reference, given_name, family_name,
          date_of_birth, metadata, created_at, updated_at
      `,
      [
        input.organizationId,
        input.externalReference ?? null,
        input.givenName,
        input.familyName,
        input.dateOfBirth ?? null,
        input.metadata ?? {}
      ],
    );

    return mapCandidate(result.rows[0]);
  }

  async findById(id: string): Promise<Candidate | null> {
    const result = await this.database.query<CandidateRow>(
      `
        SELECT id, organization_id, external_reference, given_name, family_name,
          date_of_birth, metadata, created_at, updated_at
        FROM candidates
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ? mapCandidate(result.rows[0]) : null;
  }

  async list(filters: { organizationId?: string } = {}): Promise<Candidate[]> {
    const params: string[] = [];
    const where = filters.organizationId ? "WHERE organization_id = $1" : "";

    if (filters.organizationId) {
      params.push(filters.organizationId);
    }

    const result = await this.database.query<CandidateRow>(
      `
        SELECT id, organization_id, external_reference, given_name, family_name,
          date_of_birth, metadata, created_at, updated_at
        FROM candidates
        ${where}
        ORDER BY created_at DESC, family_name ASC, given_name ASC
      `,
      params,
    );

    return result.rows.map(mapCandidate);
  }

  async update(
    id: string,
    input: {
      externalReference?: string | null;
      givenName?: string;
      familyName?: string;
      dateOfBirth?: string | null;
      metadata?: JsonObject;
    },
  ): Promise<Candidate | null> {
    const values: unknown[] = [id];
    const assignments: string[] = [];

    if ("externalReference" in input) {
      values.push(input.externalReference ?? null);
      assignments.push(`external_reference = $${values.length}`);
    }

    if (input.givenName !== undefined) {
      values.push(input.givenName);
      assignments.push(`given_name = $${values.length}`);
    }

    if (input.familyName !== undefined) {
      values.push(input.familyName);
      assignments.push(`family_name = $${values.length}`);
    }

    if ("dateOfBirth" in input) {
      values.push(input.dateOfBirth ?? null);
      assignments.push(`date_of_birth = $${values.length}`);
    }

    if (input.metadata !== undefined) {
      values.push(input.metadata);
      assignments.push(`metadata = $${values.length}`);
    }

    if (assignments.length === 0) {
      return this.findById(id);
    }

    const result = await this.database.query<CandidateRow>(
      `
        UPDATE candidates
        SET ${assignments.join(", ")}, updated_at = now()
        WHERE id = $1
        RETURNING id, organization_id, external_reference, given_name, family_name,
          date_of_birth, metadata, created_at, updated_at
      `,
      values,
    );

    return result.rows[0] ? mapCandidate(result.rows[0]) : null;
  }
}

