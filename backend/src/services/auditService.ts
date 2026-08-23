import type { AuditRepository, AuditLog, AuditEventType } from "../repositories/auditRepository.js";
import type { JsonObject } from "../domain/credentials/types.js";

export class AuditService {
  constructor(private readonly repo: AuditRepository) {}

  async logEvent(input: {
    organizationId?: string | null;
    actorUserId?: string | null;
    entityType: string;
    entityId?: string | null;
    eventType: AuditEventType;
    eventMetadata?: JsonObject;
    ipHash?: string | null;
  }): Promise<AuditLog> {
    return this.repo.create(input);
  }

  async getLogsForCredential(credentialId: string): Promise<AuditLog[]> {
    return this.repo.listByCredential(credentialId);
  }

  async getLogsForCandidate(candidateId: string): Promise<AuditLog[]> {
    return this.repo.listByCandidate(candidateId);
  }

  async getLogsForOrganization(organizationId: string): Promise<AuditLog[]> {
    return this.repo.listByOrganization(organizationId);
  }
}
