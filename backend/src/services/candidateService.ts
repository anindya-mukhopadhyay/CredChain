import type { CandidateRepository, Candidate } from "../repositories/candidateRepository.js";
import { conflict } from "../errors/apiError.js";
import type { JsonObject } from "../domain/credentials/types.js";

export class CandidateService {
  constructor(private readonly repo: CandidateRepository) {}

  async create(input: {
    organizationId: string;
    externalReference?: string | null;
    givenName: string;
    familyName: string;
    dateOfBirth?: string | null;
    metadata?: JsonObject;
  }): Promise<Candidate> {
    if (input.externalReference) {
      const existing = await this.repo.list({ organizationId: input.organizationId });
      const duplicate = existing.find(
        (cand) => cand.externalReference === input.externalReference
      );

      if (duplicate) {
        throw conflict(
          `Candidate with external reference "${input.externalReference}" already exists in this organization`
        );
      }
    }

    return this.repo.create(input);
  }

  async findById(id: string): Promise<Candidate | null> {
    return this.repo.findById(id);
  }

  async list(filters: { organizationId?: string } = {}): Promise<Candidate[]> {
    return this.repo.list(filters);
  }
}
