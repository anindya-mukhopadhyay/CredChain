import type { DatabaseClient } from "../db/pool.js";
import type { JsonObject } from "../domain/credentials/types.js";

export type AuditEventType =
  | "ORGANIZATION_CREATED"
  | "CANDIDATE_CREATED"
  | "CREDENTIAL_CREATED"
  | "CREDENTIAL_UPDATED"
  | "CREDENTIAL_FINALIZED"
  | "CREDENTIAL_VERIFIED"
  | "CREDENTIAL_TAMPER_DETECTED"
  | "CREDENTIAL_REVOKED"
  | "DEGREE_CREDENTIAL_ISSUED";

export type AuditLog = {
  id: string;
  organizationId: string | null;
  actorUserId: string | null;
  entityType: string;
  entityId: string | null;
  eventType: AuditEventType | string;
  eventMetadata: JsonObject;
  ipHash: string | null;
  createdAt: string;
};

type AuditLogRow = {
  id: string;
  organization_id: string | null;
  actor_user_id: string | null;
  entity_type: string;
  entity_id: string | null;
  event_type: string;
  event_metadata: JsonObject;
  ip_hash: string | null;
  created_at: Date;
};

function mapAuditLog(row: AuditLogRow): AuditLog {
  return {
    id: row.id,
    organizationId: row.organization_id,
    actorUserId: row.actor_user_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    eventType: row.event_type,
    eventMetadata: row.event_metadata,
    ipHash: row.ip_hash,
    createdAt: row.created_at.toISOString()
  };
}

export class AuditRepository {
  constructor(private readonly database: DatabaseClient) {}

  async create(input: {
    organizationId?: string | null;
    actorUserId?: string | null;
    entityType: string;
    entityId?: string | null;
    eventType: AuditEventType;
    eventMetadata?: JsonObject;
    ipHash?: string | null;
  }): Promise<AuditLog> {
    const result = await this.database.query<AuditLogRow>(
      `
        INSERT INTO audit_logs (
          organization_id,
          actor_user_id,
          entity_type,
          entity_id,
          event_type,
          event_metadata,
          ip_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, organization_id, actor_user_id, entity_type, entity_id,
          event_type, event_metadata, ip_hash, created_at
      `,
      [
        input.organizationId ?? null,
        input.actorUserId ?? null,
        input.entityType,
        input.entityId ?? null,
        input.eventType,
        input.eventMetadata ?? {},
        input.ipHash ?? null
      ],
    );

    return mapAuditLog(result.rows[0]);
  }

  async listByCredential(credentialId: string): Promise<AuditLog[]> {
    const result = await this.database.query<AuditLogRow>(
      `
        SELECT id, organization_id, actor_user_id, entity_type, entity_id,
          event_type, event_metadata, ip_hash, created_at
        FROM audit_logs
        WHERE (entity_type = 'credential' AND entity_id = $1)
          OR event_metadata->>'credentialId' = $1
        ORDER BY created_at DESC
      `,
      [credentialId],
    );

    return result.rows.map(mapAuditLog);
  }

  async listByCandidate(candidateId: string): Promise<AuditLog[]> {
    const result = await this.database.query<AuditLogRow>(
      `
        SELECT id, organization_id, actor_user_id, entity_type, entity_id,
          event_type, event_metadata, ip_hash, created_at
        FROM audit_logs
        WHERE (entity_type = 'candidate' AND entity_id = $1)
          OR event_metadata->>'candidateId' = $1
        ORDER BY created_at DESC
      `,
      [candidateId],
    );

    return result.rows.map(mapAuditLog);
  }

  async listByOrganization(organizationId: string): Promise<AuditLog[]> {
    const result = await this.database.query<AuditLogRow>(
      `
        SELECT id, organization_id, actor_user_id, entity_type, entity_id,
          event_type, event_metadata, ip_hash, created_at
        FROM audit_logs
        WHERE organization_id = $1
        ORDER BY created_at DESC
      `,
      [organizationId],
    );

    return result.rows.map(mapAuditLog);
  }

  async list(filters: { organizationId?: string; entityId?: string; candidateId?: string; credentialId?: string; limit?: number } = {}): Promise<AuditLog[]> {
    const predicates: string[] = [];
    const values: (string | number)[] = [];

    if (filters.organizationId) {
      values.push(filters.organizationId);
      predicates.push(`organization_id = $${values.length}`);
    }

    if (filters.entityId) {
      values.push(filters.entityId);
      predicates.push(`entity_id = $${values.length}`);
    }

    if (filters.candidateId) {
      values.push(filters.candidateId);
      predicates.push(`(entity_id = $${values.length} OR event_metadata->>'candidateId' = $${values.length})`);
    }

    if (filters.credentialId) {
      values.push(filters.credentialId);
      predicates.push(`(entity_id = $${values.length} OR event_metadata->>'credentialId' = $${values.length})`);
    }

    const whereClause = predicates.length > 0 ? `WHERE ${predicates.join(" AND ")}` : "";
    const limitClause = filters.limit ? `LIMIT ${filters.limit}` : "LIMIT 100";

    const result = await this.database.query<AuditLogRow>(
      `
        SELECT id, organization_id, actor_user_id, entity_type, entity_id,
          event_type, event_metadata, ip_hash, created_at
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        ${limitClause}
      `,
      values
    );

    return result.rows.map(mapAuditLog);
  }
}

