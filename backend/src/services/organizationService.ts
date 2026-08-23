import type { OrganizationRepository, Organization, OrganizationType } from "../repositories/organizationRepository.js";
import { conflict } from "../errors/apiError.js";

export class OrganizationService {
  constructor(private readonly repo: OrganizationRepository) {}

  async create(input: { name: string; organizationType: OrganizationType }): Promise<Organization> {
    const existing = await this.repo.list();
    const duplicate = existing.find(
      (org) => org.name.toLowerCase() === input.name.toLowerCase() && org.organizationType === input.organizationType
    );

    if (duplicate) {
      throw conflict(`Organization with name "${input.name}" and type "${input.organizationType}" already exists`);
    }

    return this.repo.create(input);
  }

  async findById(id: string): Promise<Organization | null> {
    return this.repo.findById(id);
  }

  async list(): Promise<Organization[]> {
    return this.repo.list();
  }
}
