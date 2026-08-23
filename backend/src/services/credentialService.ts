import type { CredentialRepository, Credential } from "../repositories/credentialRepository.js";
import type { OrganizationRepository } from "../repositories/organizationRepository.js";
import type { CandidateRepository } from "../repositories/candidateRepository.js";
import type { AuditRepository, AuditLog } from "../repositories/auditRepository.js";
import { badRequest, notFound } from "../errors/apiError.js";
import type { JsonObject, CanonicalCredential, CredentialStatus } from "../domain/credentials/types.js";
import { hashCanonicalCredential } from "../domain/credentials/canonicalCredential.js";
import type { TransactionalDatabase, DatabaseClient } from "../db/pool.js";
import { withTransaction } from "../db/pool.js";
import type { BlockchainService } from "./blockchain/blockchainService.js";
interface RawSubject {
  subjectCode?: string;
  code?: string;
  subjectName?: string;
  name?: string;
  credits?: number;
  grade?: string;
  marks?: number;
}

export type VerificationStatus =
  | "VERIFIED"
  | "TAMPERED"
  | "REVOKED"
  | "NOT_FOUND"
  | "INVALID"
  | "PENDING_BLOCKCHAIN";

export type VerificationResult = {
  status: VerificationStatus;
  hashMismatch?: boolean;
  dbHash?: string | null;
  computedHash?: string;
  blockchainHash?: string | null;
};

export function mapToCanonical(credential: Credential): CanonicalCredential {
  const payload = credential.credentialPayload;
  const canonical: CanonicalCredential = {
    credentialId: credential.id,
    credentialType: credential.credentialType,
    candidateId: credential.candidateId,
    organizationId: credential.organizationId,
    issueDate: credential.issueDate || new Date().toISOString().slice(0, 10),
    expiryDate: credential.expiryDate,
    status: "FINALIZED",
    finalizedAt: null,
    payload: payload
  };

  if (credential.credentialType === "BTECH_SEMESTER_MARKSHEET" && payload) {
    const semNumber = typeof payload.semester === "number" ? payload.semester : undefined;
    const resultStatus = (payload.result === "PASS" || payload.result === "FAIL" || payload.result === "WITHHELD") ? payload.result : undefined;

    if (semNumber !== undefined && resultStatus !== undefined) {
      let semesterGpa = typeof payload.semesterGpa === "number" ? payload.semesterGpa : undefined;
      if (semesterGpa === undefined && typeof payload.gpa === "number") {
        semesterGpa = payload.gpa;
      }

      const rawSubjects = Array.isArray(payload.subjects) ? (payload.subjects as RawSubject[]) : [];

      if (semesterGpa === undefined) {
        let totalCredits = 0;
        let weightedPoints = 0;
        for (const sub of rawSubjects) {
          const credits = typeof sub.credits === "number" ? sub.credits : 0;
          const grade = typeof sub.grade === "string" ? sub.grade.toUpperCase() : "";
          let points = 0;
          if (grade === "A" || grade === "O" || grade === "A+") points = 10;
          else if (grade === "B" || grade === "B+") points = 8;
          else if (grade === "C" || grade === "C+") points = 6;
          else if (grade === "D" || grade === "D+") points = 4;
          else points = 0;

          totalCredits += credits;
          weightedPoints += points * credits;
        }
        semesterGpa = totalCredits > 0 ? Number((weightedPoints / totalCredits).toFixed(2)) : 0;
      }

      const overallGpa = typeof payload.overallGpa === "number" ? payload.overallGpa : null;

      canonical.semester = {
        number: semNumber,
        resultStatus: resultStatus as "PASS" | "FAIL" | "WITHHELD",
        semesterGpa,
        overallGpa,
        subjects: rawSubjects.map((sub: RawSubject) => ({
          subjectCode: sub.subjectCode || sub.code || "",
          subjectName: sub.subjectName || sub.name || "",
          credits: typeof sub.credits === "number" ? sub.credits : 0,
          grade: sub.grade || "",
          marks: typeof sub.marks === "number" ? sub.marks : undefined
        }))
      };
    }
  }

  return canonical;
}

export class CredentialService {
  constructor(
    private readonly pool: TransactionalDatabase,
    private readonly repo: CredentialRepository,
    private readonly orgRepo: OrganizationRepository,
    private readonly candidateRepo: CandidateRepository,
    private readonly auditRepo: AuditRepository,
    private readonly blockchainService?: BlockchainService
  ) {}

  async createDraft(input: {
    credentialNumber: string;
    credentialType: string;
    candidateId: string;
    organizationId: string;
    expiryDate?: string | null;
    credentialPayload: JsonObject;
  }): Promise<Credential> {
    const org = await this.orgRepo.findById(input.organizationId);
    if (!org) throw notFound("Organization");

    const candidate = await this.candidateRepo.findById(input.candidateId);
    if (!candidate) throw notFound("Candidate");

    if (candidate.organizationId !== input.organizationId) {
      throw badRequest("Candidate does not belong to the issuing organization");
    }

    const created = await this.repo.createDraft(input);

    await this.auditRepo.create({
      organizationId: input.organizationId,
      entityType: "credential",
      entityId: created.id,
      eventType: "CREDENTIAL_CREATED",
      eventMetadata: { credentialNumber: input.credentialNumber }
    });

    return created;
  }

  async findById(id: string): Promise<Credential | null> {
    return this.repo.findById(id);
  }

  async list(filters: { organizationId?: string; candidateId?: string; status?: CredentialStatus } = {}): Promise<Credential[]> {
    return this.repo.list(filters);
  }

  async updateDraftPayload(id: string, credentialPayload: JsonObject): Promise<Credential> {
    const credential = await this.repo.findById(id);
    if (!credential) throw notFound("Credential");

    if (credential.status !== "DRAFT") {
      throw badRequest(`Cannot update credential payload in ${credential.status} status`);
    }

    const updated = await this.repo.updateDraftPayload(id, credentialPayload);
    if (!updated) throw notFound("Credential");

    return updated;
  }

  async finalize(id: string): Promise<Credential> {
    const credential = await this.repo.findById(id);
    if (!credential) throw notFound("Credential");

    if (credential.status !== "DRAFT") {
      throw badRequest(`Only DRAFT credentials can be finalized, current status: ${credential.status}`);
    }

    const finalizedAt = new Date();
    const issueDate = finalizedAt.toISOString().slice(0, 10);

    const tempCredential = {
      ...credential,
      issueDate
    };

    const canonical = mapToCanonical(tempCredential);
    const hash = hashCanonicalCredential(canonical);

    const finalized = await withTransaction(this.pool, async (client) => {
      const RepoClass = this.repo.constructor as new (db: DatabaseClient) => CredentialRepository;
      const AuditRepoClass = this.auditRepo.constructor as new (db: DatabaseClient) => AuditRepository;
      const txRepo = new RepoClass(client);
      const txAuditRepo = new AuditRepoClass(client);

      const updated = await txRepo.finalize({
        id,
        canonicalHash: hash,
        issueDate,
        finalizedAt
      });

      if (!updated) {
        throw badRequest("Failed to finalize credential in database");
      }

      if (credential.credentialType === "BTECH_SEMESTER_MARKSHEET") {
        const payload = credential.credentialPayload;
        const semNumber = typeof payload.semester === "number" ? payload.semester : undefined;
        const resultStatus = (payload.result === "PASS" || payload.result === "FAIL" || payload.result === "WITHHELD") ? payload.result : undefined;

        if (semNumber !== undefined && resultStatus !== undefined) {
          const subjects = Array.isArray(payload.subjects) ? (payload.subjects as JsonObject[]) : [];
          await txRepo.upsertSemesterResult({
            credentialId: id,
            candidateId: credential.candidateId,
            semesterNumber: semNumber,
            resultStatus: resultStatus as "PASS" | "FAIL" | "WITHHELD",
            subjects,
            finalizedAt
          });
        }
      }

      await txAuditRepo.create({
        organizationId: credential.organizationId,
        entityType: "credential",
        entityId: id,
        eventType: "CREDENTIAL_FINALIZED",
        eventMetadata: { canonicalHash: hash }
      });

      return updated;
    });

    // Blockchain registration
    if (this.blockchainService) {
      try {
        const txHash = await this.blockchainService.registerCredential(
          finalized.id,
          hash,
          finalized.credentialType
        );

        // Update status to ISSUED with blockchain transaction link
        const txResult = await this.pool.query(
          `
            INSERT INTO blockchain_transactions (
              credential_id, network_name, chain_id, transaction_hash, contract_address, status
            )
            VALUES ($1, 'localhost', 31337, $2, $3, 'CONFIRMED')
            RETURNING id
          `,
          [finalized.id, txHash, this.blockchainService.contractAddress || "unknown"]
        );

        const txId = txResult.rows[0]?.id;

        await this.pool.query(
          "UPDATE credentials SET status = 'ISSUED', blockchain_tx_id = $2, updated_at = now() WHERE id = $1",
          [finalized.id, txId]
        );

        const finalizedWithTx = await this.repo.findById(id);
        return finalizedWithTx || finalized;
      } catch (err: unknown) {
        const error = err as Error;
        // Log error but keep status as FINALIZED (effectively PENDING_BLOCKCHAIN)
        console.error(`Blockchain registration failed for credential ${finalized.id}: ${error.message}`);
      }
    }

    return finalized;
  }

  async verify(id: string): Promise<VerificationResult> {
    const credential = await this.repo.findById(id);
    if (!credential) {
      return { status: "NOT_FOUND" };
    }

    const isRevokedDb = await this.repo.isRevoked(id);
    if (isRevokedDb || credential.status === "REVOKED") {
      return { status: "REVOKED" };
    }

    if (credential.status === "DRAFT") {
      return { status: "INVALID" };
    }

    const canonical = mapToCanonical(credential);
    const computedHash = hashCanonicalCredential(canonical);
    const dbHash = credential.canonicalHash;

    if (computedHash !== dbHash) {
      return {
        status: "TAMPERED",
        hashMismatch: true,
        dbHash,
        computedHash
      };
    }

    if (!this.blockchainService) {
      return {
        status: "PENDING_BLOCKCHAIN",
        dbHash,
        computedHash
      };
    }

    try {
      const proof = await this.blockchainService.getCredential(id);

      if (!proof) {
        return {
          status: "PENDING_BLOCKCHAIN",
          dbHash,
          computedHash
        };
      }

      if (proof.status === 2) {
        return { status: "REVOKED" };
      }

      const computedHashWithPrefix = computedHash.startsWith("0x") ? computedHash : `0x${computedHash}`;
      if (proof.documentHash !== computedHashWithPrefix) {
        return {
          status: "TAMPERED",
          hashMismatch: true,
          dbHash,
          computedHash,
          blockchainHash: proof.documentHash
        };
      }

      return {
        status: "VERIFIED",
        dbHash,
        computedHash,
        blockchainHash: proof.documentHash
      };
    } catch (err: unknown) {
      const error = err as Error;
      console.error(`Error reading from blockchain for verification: ${error.message}`);
      return {
        status: "PENDING_BLOCKCHAIN",
        dbHash,
        computedHash
      };
    }
  }

  async revoke(id: string, reasonCode: string, note?: string, actorUserId?: string): Promise<Credential> {
    const credential = await this.repo.findById(id);
    if (!credential) throw notFound("Credential");

    if (credential.status === "REVOKED") {
      return credential;
    }

    const updated = await withTransaction(this.pool, async (client) => {
      const RepoClass = this.repo.constructor as new (db: DatabaseClient) => CredentialRepository;
      const AuditRepoClass = this.auditRepo.constructor as new (db: DatabaseClient) => AuditRepository;
      const txRepo = new RepoClass(client);
      const txAuditRepo = new AuditRepoClass(client);

      await client.query(
        `
          INSERT INTO revocations (credential_id, reason_code, reason_note, revoked_by_user_id)
          VALUES ($1, $2, $3, $4)
        `,
        [id, reasonCode, note || null, actorUserId || null]
      );

      const revoked = await txRepo.updateStatus(id, "REVOKED");
      if (!revoked) throw notFound("Credential");

      await txAuditRepo.create({
        organizationId: credential.organizationId,
        actorUserId: actorUserId || null,
        entityType: "credential",
        entityId: id,
        eventType: "CREDENTIAL_REVOKED",
        eventMetadata: { reasonCode, note: note || null }
      });

      return revoked;
    });

    if (this.blockchainService) {
      try {
        await this.blockchainService.revokeCredential(id, reasonCode);
      } catch (err: unknown) {
        const error = err as Error;
        console.error(`Blockchain revocation failed for credential ${id}: ${error.message}`);
      }
    }

    return updated;
  }

  async getStats(organizationId?: string): Promise<{
    totalCandidates: number;
    totalCredentials: number;
    issuedCredentials: number;
    draftCredentials: number;
    revokedCredentials: number;
    verifiedCredentials: number;
  }> {
    const candidateFilter = organizationId ? { organizationId } : {};
    const credentialFilter = organizationId ? { organizationId } : {};

    const [candidates, credentials] = await Promise.all([
      this.candidateRepo.list(candidateFilter),
      this.repo.list(credentialFilter)
    ]);

    const totalCandidates = candidates.length;
    const totalCredentials = credentials.length;
    const issuedCredentials = credentials.filter((c) => c.status === "ISSUED").length;
    const draftCredentials = credentials.filter((c) => c.status === "DRAFT" || c.status === "FINALIZED").length;
    const revokedCredentials = credentials.filter((c) => c.status === "REVOKED").length;
    const verifiedCredentials = issuedCredentials;

    return {
      totalCandidates,
      totalCredentials,
      issuedCredentials,
      draftCredentials,
      revokedCredentials,
      verifiedCredentials
    };
  }

  async getAuditLogs(filters: { organizationId?: string; credentialId?: string; candidateId?: string } = {}): Promise<AuditLog[]> {
    if (filters.credentialId) {
      return this.auditRepo.listByCredential(filters.credentialId);
    }
    if (filters.candidateId) {
      return this.auditRepo.listByCandidate(filters.candidateId);
    }
    if (filters.organizationId) {
      return this.auditRepo.listByOrganization(filters.organizationId);
    }

    const result = await this.pool.query<{
      id: string;
      organization_id: string | null;
      actor_user_id: string | null;
      entity_type: string;
      entity_id: string | null;
      event_type: string;
      event_metadata: JsonObject;
      ip_hash: string | null;
      created_at: Date;
    }>(
      "SELECT id, organization_id, actor_user_id, entity_type, entity_id, event_type, event_metadata, ip_hash, created_at FROM audit_logs ORDER BY created_at DESC LIMIT 50"
    );

    return result.rows.map((row) => ({
      id: row.id,
      organizationId: row.organization_id,
      actorUserId: row.actor_user_id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      eventType: row.event_type,
      eventMetadata: row.event_metadata,
      ipHash: row.ip_hash,
      createdAt: row.created_at.toISOString()
    }));
  }
}
