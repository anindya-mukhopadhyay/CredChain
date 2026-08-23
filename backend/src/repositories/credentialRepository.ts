import type { DatabaseClient } from "../db/pool.js";
import type { CredentialStatus, JsonObject } from "../domain/credentials/types.js";

export type Credential = {
  id: string;
  credentialNumber: string;
  credentialType: string;
  candidateId: string;
  organizationId: string;
  issuerUserId: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  status: CredentialStatus;
  canonicalHash: string | null;
  documentUri: string | null;
  verificationUrl: string | null;
  blockchainTxId: string | null;
  credentialPayload: JsonObject;
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type CredentialRow = {
  id: string;
  credential_number: string;
  credential_type: string;
  candidate_id: string;
  organization_id: string;
  issuer_user_id: string | null;
  issue_date: Date | string | null;
  expiry_date: Date | string | null;
  status: CredentialStatus;
  canonical_hash: string | null;
  document_uri: string | null;
  verification_url: string | null;
  blockchain_tx_id: string | null;
  credential_payload: JsonObject;
  finalized_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

export type CredentialRelationship = {
  id: string;
  sourceCredentialId: string;
  targetCredentialId: string;
  relationshipType: "DERIVED_FROM" | "PART_OF" | "SUPPORTS" | "PREREQUISITE_FOR";
  createdAt: string;
};

export type SemesterResultRecord = {
  id: string;
  credentialId: string;
  candidateId: string;
  semesterNumber: number;
  resultStatus: "PASS" | "FAIL" | "WITHHELD";
  semesterGpa: number | null;
  overallGpa: number | null;
  subjects: JsonObject[];
  finalizedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type SemesterResultRow = {
  id: string;
  credential_id: string;
  candidate_id: string;
  semester_number: number;
  result_status: "PASS" | "FAIL" | "WITHHELD";
  semester_gpa: string | number | null;
  overall_gpa: string | number | null;
  subjects: JsonObject[];
  finalized_at: Date | null;
  created_at: Date;
  updated_at: Date;
};

type RelationshipRow = {
  id: string;
  source_credential_id: string;
  target_credential_id: string;
  relationship_type: "DERIVED_FROM" | "PART_OF" | "SUPPORTS" | "PREREQUISITE_FOR";
  created_at: Date;
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

function mapCredential(row: CredentialRow): Credential {
  return {
    id: row.id,
    credentialNumber: row.credential_number,
    credentialType: row.credential_type,
    candidateId: row.candidate_id,
    organizationId: row.organization_id,
    issuerUserId: row.issuer_user_id,
    issueDate: mapDateOnly(row.issue_date),
    expiryDate: mapDateOnly(row.expiry_date),
    status: row.status,
    canonicalHash: row.canonical_hash,
    documentUri: row.document_uri,
    verificationUrl: row.verification_url,
    blockchainTxId: row.blockchain_tx_id,
    credentialPayload: row.credential_payload,
    finalizedAt: row.finalized_at?.toISOString() ?? null,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString()
  };
}

const credentialColumns = `
  id,
  credential_number,
  credential_type,
  candidate_id,
  organization_id,
  issuer_user_id,
  issue_date,
  expiry_date,
  status,
  canonical_hash,
  document_uri,
  verification_url,
  blockchain_tx_id,
  credential_payload,
  finalized_at,
  created_at,
  updated_at
`;

export class CredentialRepository {
  constructor(private readonly database: DatabaseClient) {}

  async createDraft(input: {
    credentialNumber: string;
    credentialType: string;
    candidateId: string;
    organizationId: string;
    expiryDate?: string | null;
    credentialPayload: JsonObject;
  }): Promise<Credential> {
    const result = await this.database.query<CredentialRow>(
      `
        INSERT INTO credentials (
          credential_number,
          credential_type,
          candidate_id,
          organization_id,
          expiry_date,
          status,
          credential_payload
        )
        VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6)
        RETURNING ${credentialColumns}
      `,
      [
        input.credentialNumber,
        input.credentialType,
        input.candidateId,
        input.organizationId,
        input.expiryDate ?? null,
        input.credentialPayload
      ],
    );

    return mapCredential(result.rows[0]);
  }

  async findById(id: string): Promise<Credential | null> {
    const result = await this.database.query<CredentialRow>(
      `
        SELECT ${credentialColumns}
        FROM credentials
        WHERE id = $1
      `,
      [id],
    );

    return result.rows[0] ? mapCredential(result.rows[0]) : null;
  }

  async list(
    filters: { organizationId?: string; candidateId?: string; status?: CredentialStatus } = {},
  ): Promise<Credential[]> {
    const values: string[] = [];
    const predicates: string[] = [];

    if (filters.organizationId) {
      values.push(filters.organizationId);
      predicates.push(`organization_id = $${values.length}`);
    }

    if (filters.candidateId) {
      values.push(filters.candidateId);
      predicates.push(`candidate_id = $${values.length}`);
    }

    if (filters.status) {
      values.push(filters.status);
      predicates.push(`status = $${values.length}`);
    }

    const where = predicates.length > 0 ? `WHERE ${predicates.join(" AND ")}` : "";
    const result = await this.database.query<CredentialRow>(
      `
        SELECT ${credentialColumns}
        FROM credentials
        ${where}
        ORDER BY created_at DESC, credential_number ASC
      `,
      values,
    );

    return result.rows.map(mapCredential);
  }

  async updateStatus(id: string, status: CredentialStatus): Promise<Credential | null> {
    const result = await this.database.query<CredentialRow>(
      `
        UPDATE credentials
        SET status = $2, updated_at = now()
        WHERE id = $1
        RETURNING ${credentialColumns}
      `,
      [id, status],
    );

    return result.rows[0] ? mapCredential(result.rows[0]) : null;
  }

  async updateDraftPayload(id: string, credentialPayload: JsonObject): Promise<Credential | null> {
    const result = await this.database.query<CredentialRow>(
      `
        UPDATE credentials
        SET credential_payload = $2, updated_at = now()
        WHERE id = $1 AND status = 'DRAFT'
        RETURNING ${credentialColumns}
      `,
      [id, credentialPayload],
    );

    return result.rows[0] ? mapCredential(result.rows[0]) : null;
  }

  async finalize(input: {
    id: string;
    canonicalHash: string;
    issueDate: string;
    finalizedAt: Date;
  }): Promise<Credential | null> {
    const result = await this.database.query<CredentialRow>(
      `
        UPDATE credentials
        SET
          status = 'FINALIZED',
          canonical_hash = $2,
          issue_date = $3,
          finalized_at = $4,
          updated_at = now()
        WHERE id = $1 AND status = 'DRAFT'
        RETURNING ${credentialColumns}
      `,
      [input.id, input.canonicalHash, input.issueDate, input.finalizedAt],
    );

    return result.rows[0] ? mapCredential(result.rows[0]) : null;
  }

  async storeHash(id: string, canonicalHash: string): Promise<Credential | null> {
    const result = await this.database.query<CredentialRow>(
      `
        UPDATE credentials
        SET canonical_hash = $2, updated_at = now()
        WHERE id = $1
        RETURNING ${credentialColumns}
      `,
      [id, canonicalHash],
    );

    return result.rows[0] ? mapCredential(result.rows[0]) : null;
  }

  async upsertSemesterResult(input: {
    credentialId: string;
    candidateId: string;
    semesterNumber: number;
    resultStatus: "PASS" | "FAIL" | "WITHHELD";
    subjects: JsonObject[];
    finalizedAt: Date;
  }): Promise<void> {
    await this.database.query<SemesterResultRow>(
      `
        INSERT INTO semester_results (
          credential_id,
          candidate_id,
          semester_number,
          result_status,
          subjects,
          finalized_at
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (credential_id)
        DO UPDATE SET
          result_status = EXCLUDED.result_status,
          subjects = EXCLUDED.subjects,
          finalized_at = EXCLUDED.finalized_at,
          updated_at = now()
      `,
      [
        input.credentialId,
        input.candidateId,
        input.semesterNumber,
        input.resultStatus,
        JSON.stringify(input.subjects),
        input.finalizedAt
      ],
    );
  }

  async isRevoked(id: string): Promise<boolean> {
    const result = await this.database.query<{ exists: boolean }>(
      "SELECT EXISTS (SELECT 1 FROM revocations WHERE credential_id = $1) AS exists",
      [id],
    );

    return result.rows[0]?.exists ?? false;
  }

  async createRelationship(input: {
    sourceCredentialId: string;
    targetCredentialId: string;
    relationshipType: "DERIVED_FROM" | "PART_OF" | "SUPPORTS" | "PREREQUISITE_FOR";
  }): Promise<void> {
    await this.database.query(
      `
        INSERT INTO credential_relationships (
          source_credential_id,
          target_credential_id,
          relationship_type
        )
        VALUES ($1, $2, $3)
        ON CONFLICT (source_credential_id, target_credential_id, relationship_type)
        DO NOTHING
      `,
      [input.sourceCredentialId, input.targetCredentialId, input.relationshipType],
    );
  }

  async getRelationships(credentialId: string): Promise<CredentialRelationship[]> {
    const result = await this.database.query<RelationshipRow>(
      `
        SELECT id, source_credential_id, target_credential_id, relationship_type, created_at
        FROM credential_relationships
        WHERE source_credential_id = $1 OR target_credential_id = $1
        ORDER BY created_at ASC
      `,
      [credentialId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      sourceCredentialId: row.source_credential_id,
      targetCredentialId: row.target_credential_id,
      relationshipType: row.relationship_type,
      createdAt: row.created_at.toISOString(),
    }));
  }

  async getSemesterResultsByCandidate(candidateId: string): Promise<SemesterResultRecord[]> {
    const result = await this.database.query<SemesterResultRow>(
      `
        SELECT
          id,
          credential_id,
          candidate_id,
          semester_number,
          result_status,
          semester_gpa,
          overall_gpa,
          subjects,
          finalized_at,
          created_at,
          updated_at
        FROM semester_results
        WHERE candidate_id = $1
        ORDER BY semester_number ASC
      `,
      [candidateId],
    );

    return result.rows.map((row) => ({
      id: row.id,
      credentialId: row.credential_id,
      candidateId: row.candidate_id,
      semesterNumber: row.semester_number,
      resultStatus: row.result_status,
      semesterGpa: row.semester_gpa !== null ? Number(row.semester_gpa) : null,
      overallGpa: row.overall_gpa !== null ? Number(row.overall_gpa) : null,
      subjects: row.subjects || [],
      finalizedAt: row.finalized_at ? row.finalized_at.toISOString() : null,
      createdAt: row.created_at.toISOString(),
      updatedAt: row.updated_at.toISOString(),
    }));
  }

  async findSemesterCredential(
    candidateId: string,
    semesterNumber: number
  ): Promise<Credential | null> {
    const result = await this.database.query<CredentialRow>(
      `
        SELECT
          c.id,
          c.credential_number,
          c.credential_type,
          c.candidate_id,
          c.organization_id,
          c.issuer_user_id,
          c.issue_date,
          c.expiry_date,
          c.status,
          c.canonical_hash,
          c.document_uri,
          c.verification_url,
          c.blockchain_tx_id,
          c.credential_payload,
          c.finalized_at,
          c.created_at,
          c.updated_at
        FROM credentials c
        JOIN semester_results sr ON sr.credential_id = c.id
        WHERE sr.candidate_id = $1 AND sr.semester_number = $2
        ORDER BY c.created_at DESC
        LIMIT 1
      `,
      [candidateId, semesterNumber],
    );

    return result.rows[0] ? mapCredential(result.rows[0]) : null;
  }
}

