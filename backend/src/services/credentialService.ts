import type { CredentialRepository, Credential, CredentialRelationship } from "../repositories/credentialRepository.js";
import type { OrganizationRepository } from "../repositories/organizationRepository.js";
import type { CandidateRepository } from "../repositories/candidateRepository.js";
import type { AuditRepository, AuditLog } from "../repositories/auditRepository.js";
import { badRequest, notFound } from "../errors/apiError.js";
import type {
  JsonObject,
  CanonicalCredential,
  CredentialStatus,
  DegreeEligibilityResult,
  SemesterEligibilityCheck,
  AcademicClassification,
  BTechDegreePayload
} from "../domain/credentials/types.js";
import { hashCanonicalCredential } from "../domain/credentials/canonicalCredential.js";
import type { TransactionalDatabase, DatabaseClient } from "../db/pool.js";
import { withTransaction } from "../db/pool.js";
import type { BlockchainService } from "./blockchain/blockchainService.js";

export interface RawSubject {
  subjectCode?: string;
  code?: string;
  subjectName?: string;
  name?: string;
  credits?: number;
  grade?: string;
  marks?: number;
}

export type ActorContext = {
  organizationId?: string;
  userId?: string;
  role?: string;
};

export type VerificationStatus =
  | "VERIFIED"
  | "TAMPERED"
  | "UNTRUSTED_ISSUER"
  | "REVOKED"
  | "ISSUED_WITH_REVOKED_PREREQUISITE"
  | "NOT_FOUND"
  | "INVALID"
  | "PENDING_BLOCKCHAIN";

export type AffectedPrerequisite = {
  semesterNumber: number;
  credentialId: string;
  credentialNumber?: string;
  status: VerificationStatus;
  reason: string;
};

export type ConstituentSemesterVerification = {
  semesterNumber: number;
  credentialId: string;
  credentialNumber: string;
  status: VerificationStatus;
  isPassed: boolean;
  semesterGpa: number;
  credits: number;
  hashMismatch?: boolean;
  dbHash?: string | null;
  blockchainHash?: string | null;
};

export type VerificationResult = {
  status: VerificationStatus;
  degreeStatus?: CredentialStatus;
  affectedPrerequisites?: AffectedPrerequisite[];
  hashMismatch?: boolean;
  dbHash?: string | null;
  computedHash?: string;
  blockchainHash?: string | null;
  issuerAddress?: string | null;
  degreeDetails?: {
    programName: string;
    degreeTitle: string;
    cumulativeGpa: number;
    totalCreditsEarned: number;
    classification: AcademicClassification;
    totalSemesters: number;
  };
  chainVerification?: {
    isChainValid: boolean;
    totalConstituentSemesters: number;
    verifiedSemestersCount: number;
    constituentSemesters: ConstituentSemesterVerification[];
    chainIssues: string[];
  };
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

  if (credential.credentialType === "BTECH_DEGREE" && payload) {
    const totalSemesters = 8;
    const cumulativeGpa = typeof payload.cumulativeGpa === "number" ? payload.cumulativeGpa : 0;
    const totalCreditsEarned = typeof payload.totalCreditsEarned === "number" ? payload.totalCreditsEarned : 0;
    const classification = (payload.classification as AcademicClassification) || "PASS";
    const semesterCredentialIds = Array.isArray(payload.semesterCredentialIds)
      ? (payload.semesterCredentialIds as string[])
      : [];

    canonical.degree = {
      programType: "BTECH",
      programName: typeof payload.programName === "string" ? payload.programName : "Bachelor of Technology",
      degreeTitle: typeof payload.degreeTitle === "string" ? payload.degreeTitle : "Bachelor of Technology",
      totalSemesters,
      cumulativeGpa,
      totalCreditsEarned,
      classification,
      semesterCredentialIds
    };

    // The degree cryptographic commitment hash binds all constituent semester IDs (sorted)
    canonical.parentCredentialIds = [...semesterCredentialIds].sort();
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

  async createDraft(
    input: {
      credentialNumber: string;
      credentialType: string;
      candidateId: string;
      organizationId: string;
      expiryDate?: string | null;
      credentialPayload: JsonObject;
      issuerUserId?: string | null;
    },
    actorContext?: ActorContext
  ): Promise<Credential> {
    if (actorContext?.organizationId && actorContext.organizationId !== input.organizationId) {
      throw badRequest("Forbidden: Organization mismatch", "FORBIDDEN");
    }

    const candidate = await this.candidateRepo.findById(input.candidateId);
    if (!candidate) throw notFound("Candidate");

    const org = await this.orgRepo.findById(input.organizationId);
    if (!org) throw notFound("Organization");

    if (candidate.organizationId !== input.organizationId) {
      throw badRequest("Candidate does not belong to the issuing organization", "INVALID_ORGANIZATION");
    }

    const created = await withTransaction(this.pool, async (client) => {
      const RepoClass = this.repo.constructor as new (db: DatabaseClient) => CredentialRepository;
      const AuditRepoClass = this.auditRepo.constructor as new (db: DatabaseClient) => AuditRepository;
      const txRepo = new RepoClass(client);
      const txAuditRepo = new AuditRepoClass(client);

      const credential = await txRepo.createDraft({
        credentialNumber: input.credentialNumber,
        credentialType: input.credentialType,
        candidateId: input.candidateId,
        organizationId: input.organizationId,
        expiryDate: input.expiryDate,
        credentialPayload: input.credentialPayload
      });

      await txAuditRepo.create({
        organizationId: input.organizationId,
        actorUserId: input.issuerUserId || actorContext?.userId || null,
        entityType: "credential",
        entityId: credential.id,
        eventType: "CREDENTIAL_CREATED",
        eventMetadata: { credentialType: input.credentialType, credentialNumber: input.credentialNumber }
      });

      return credential;
    });

    return created;
  }

  async findById(id: string): Promise<Credential | null> {
    return this.repo.findById(id);
  }

  async list(filters: { organizationId?: string; candidateId?: string; status?: CredentialStatus } = {}): Promise<Credential[]> {
    return this.repo.list(filters);
  }

  async updateDraftPayload(id: string, payload: JsonObject, actorContext?: ActorContext | string): Promise<Credential> {
    const credential = await this.repo.findById(id);
    if (!credential) throw notFound("Credential");

    const orgId = typeof actorContext === "object" ? actorContext?.organizationId : undefined;
    const actorUserId = typeof actorContext === "object" ? actorContext?.userId : actorContext;

    if (orgId && credential.organizationId !== orgId) {
      throw badRequest("Forbidden: Credential belongs to a different organization", "FORBIDDEN");
    }

    if (credential.status !== "DRAFT") {
      throw badRequest("Only DRAFT credentials can have their payload updated");
    }

    const updated = await withTransaction(this.pool, async (client) => {
      const RepoClass = this.repo.constructor as new (db: DatabaseClient) => CredentialRepository;
      const AuditRepoClass = this.auditRepo.constructor as new (db: DatabaseClient) => AuditRepository;
      const txRepo = new RepoClass(client);
      const txAuditRepo = new AuditRepoClass(client);

      const res = await txRepo.updateDraftPayload(id, payload);
      if (!res) throw notFound("Credential");

      await txAuditRepo.create({
        organizationId: credential.organizationId,
        actorUserId: actorUserId || null,
        entityType: "credential",
        entityId: id,
        eventType: "CREDENTIAL_UPDATED",
        eventMetadata: { updatedFields: ["credentialPayload"] }
      });

      return res;
    });

    return updated;
  }

  async finalize(id: string, actorContext?: ActorContext): Promise<Credential> {
    const credential = await this.repo.findById(id);
    if (!credential) throw notFound("Credential");

    if (actorContext?.organizationId && credential.organizationId !== actorContext.organizationId) {
      throw badRequest("Forbidden: Credential belongs to a different organization", "FORBIDDEN");
    }

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

    // Prerequisite check for Semester marksheets
    let prevSemesterCredentialId: string | null = null;
    if (credential.credentialType === "BTECH_SEMESTER_MARKSHEET") {
      const semNumber = typeof credential.credentialPayload.semester === "number"
        ? credential.credentialPayload.semester
        : 1;

      if (semNumber > 1) {
        const prevSem = await this.repo.findSemesterCredential(credential.candidateId, semNumber - 1);
        if (prevSem) {
          prevSemesterCredentialId = prevSem.id;
        }
      }
    }

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

        // Link relationships in DB: S_{N-1} PREREQUISITE_FOR S_N, and S_N DERIVED_FROM S_{N-1}
        if (prevSemesterCredentialId) {
          await txRepo.createRelationship({
            sourceCredentialId: prevSemesterCredentialId,
            targetCredentialId: id,
            relationshipType: "PREREQUISITE_FOR"
          });
          await txRepo.createRelationship({
            sourceCredentialId: id,
            targetCredentialId: prevSemesterCredentialId,
            relationshipType: "DERIVED_FROM"
          });
        }
      }

      await txAuditRepo.create({
        organizationId: credential.organizationId,
        actorUserId: actorContext?.userId || null,
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

        // If this has a prerequisite, register relationship on blockchain
        if (prevSemesterCredentialId) {
          try {
            await this.blockchainService.addCredentialRelationship(
              prevSemesterCredentialId,
              finalized.id,
              "PREREQUISITE_FOR"
            );
            await this.blockchainService.addCredentialRelationship(
              finalized.id,
              prevSemesterCredentialId,
              "DERIVED_FROM"
            );
          } catch (relErr) {
            console.error(`On-chain prerequisite linking note: ${(relErr as Error).message}`);
          }
        }

        const finalizedWithTx = await this.repo.findById(id);
        return finalizedWithTx || finalized;
      } catch (err: unknown) {
        const error = err as Error;
        console.error(`Blockchain registration failed for credential ${finalized.id}: ${error.message}`);
      }
    }

    return finalized;
  }

  async checkDegreeEligibility(
    candidateId: string,
    programType: "BTECH" = "BTECH"
  ): Promise<DegreeEligibilityResult> {
    const candidate = await this.candidateRepo.findById(candidateId);
    if (!candidate) throw notFound("Candidate");

    const candidateCredentials = await this.repo.list({ candidateId });
    // Strict academic chain filtering: must belong to the candidate and match BTECH_SEMESTER_MARKSHEET
    const marksheetCredentials = candidateCredentials.filter(
      (c) => c.credentialType === "BTECH_SEMESTER_MARKSHEET" && c.candidateId === candidateId
    );

    const semesters: SemesterEligibilityCheck[] = [];
    const ineligibilityReasons: string[] = [];

    let totalCredits = 0;
    let weightedPoints = 0;
    let programName = "Bachelor of Technology in Computer Science & Engineering";

    for (let sem = 1; sem <= 8; sem++) {
      const issues: string[] = [];
      // Find matching marksheet for this semester
      const cred = marksheetCredentials.find((c) => {
        const payloadSem = typeof c.credentialPayload?.semester === "number" ? c.credentialPayload.semester : 0;
        return payloadSem === sem;
      });

      if (!cred) {
        issues.push(`Semester ${sem} marksheet has not been registered`);
        semesters.push({
          semesterNumber: sem,
          isCompleted: false,
          isPassed: false,
          isRevoked: false,
          isValid: false,
          issues
        });
        ineligibilityReasons.push(`Missing Semester ${sem} credential`);
        continue;
      }

      if (cred.organizationId !== candidate.organizationId) {
        issues.push(`Semester ${sem} credential was issued by a different organization`);
        ineligibilityReasons.push(`Semester ${sem} issuing organization mismatch`);
      }

      if (cred.credentialPayload?.program && typeof cred.credentialPayload.program === "string") {
        programName = cred.credentialPayload.program;
      }

      const isRevoked = await this.repo.isRevoked(cred.id) || cred.status === "REVOKED";
      if (isRevoked) {
        issues.push(`Semester ${sem} credential (#${cred.credentialNumber}) is REVOKED`);
        ineligibilityReasons.push(`Semester ${sem} is revoked`);
      }

      const isFinalized = cred.status === "FINALIZED" || cred.status === "ISSUED";
      if (!isFinalized) {
        issues.push(`Semester ${sem} is still in ${cred.status} status (must be FINALIZED/ISSUED)`);
        ineligibilityReasons.push(`Semester ${sem} is not finalized`);
      }

      const payload = cred.credentialPayload;
      const resultStatus = payload.result === "PASS" ? "PASS" : payload.result === "FAIL" ? "FAIL" : "WITHHELD";
      const isPassed = resultStatus === "PASS";
      if (!isPassed) {
        issues.push(`Semester ${sem} result status is ${resultStatus}`);
        ineligibilityReasons.push(`Semester ${sem} was not passed`);
      }

      // Hash integrity check
      const canonical = mapToCanonical(cred);
      const computedHash = hashCanonicalCredential(canonical);
      const isHashValid = cred.canonicalHash ? computedHash === cred.canonicalHash : false;
      if (cred.canonicalHash && !isHashValid) {
        issues.push(`Semester ${sem} data integrity check failed (Tampered hash)`);
        ineligibilityReasons.push(`Semester ${sem} data integrity check failed`);
      }

      // Compute semester credits and SGPA avoiding intermediate rounding truncation
      const rawSubjects = Array.isArray(payload.subjects) ? (payload.subjects as RawSubject[]) : [];
      let semCredits = 0;
      let semWeightedPoints = 0;
      for (const s of rawSubjects) {
        const cr = typeof s.credits === "number" ? s.credits : 0;
        const gr = typeof s.grade === "string" ? s.grade.toUpperCase() : "";
        let pts = 0;
        if (gr === "A" || gr === "O" || gr === "A+") pts = 10;
        else if (gr === "B" || gr === "B+") pts = 8;
        else if (gr === "C" || gr === "C+") pts = 6;
        else if (gr === "D" || gr === "D+") pts = 4;
        else pts = 0;

        semCredits += cr;
        semWeightedPoints += pts * cr;
      }

      let sgpa = typeof payload.semesterGpa === "number" ? payload.semesterGpa : 0;
      if (semCredits > 0) {
        sgpa = Number((semWeightedPoints / semCredits).toFixed(2));
        totalCredits += semCredits;
        weightedPoints += semWeightedPoints;
      } else if (typeof payload.credits === "number" && payload.credits > 0 && sgpa > 0) {
        totalCredits += payload.credits;
        weightedPoints += sgpa * payload.credits;
      }

      const isValid = issues.length === 0;

      semesters.push({
        semesterNumber: sem,
        credentialId: cred.id,
        credentialNumber: cred.credentialNumber,
        status: cred.status,
        resultStatus: resultStatus as "PASS" | "FAIL" | "WITHHELD",
        semesterGpa: sgpa,
        credits: semCredits,
        isCompleted: isFinalized,
        isPassed,
        isRevoked,
        isValid,
        issues
      });
    }

    const completedSemestersCount = semesters.filter((s) => s.isCompleted).length;
    const passedSemestersCount = semesters.filter((s) => s.isPassed && !s.isRevoked && s.isValid).length;
    const isEligible = passedSemestersCount === 8 && ineligibilityReasons.length === 0;

    const cumulativeGpa = totalCredits > 0 ? Number((weightedPoints / totalCredits).toFixed(2)) : 0;

    let projectedClassification: AcademicClassification = "PASS";
    if (cumulativeGpa >= 8.50) {
      projectedClassification = "FIRST_CLASS_WITH_DISTINCTION";
    } else if (cumulativeGpa >= 6.50) {
      projectedClassification = "FIRST_CLASS";
    } else if (cumulativeGpa >= 5.00) {
      projectedClassification = "SECOND_CLASS";
    }

    return {
      candidateId,
      organizationId: candidate.organizationId,
      programType,
      programName,
      isEligible,
      totalRequiredSemesters: 8,
      completedSemestersCount,
      passedSemestersCount,
      cumulativeGpa,
      totalCreditsEarned: totalCredits,
      projectedClassification,
      semesters,
      ineligibilityReasons
    };
  }

  async issueDegree(
    input: {
      candidateId: string;
      organizationId: string;
      programName?: string;
      degreeTitle?: string;
      graduationDate?: string;
      issuerUserId?: string | null;
    },
    actorContext?: ActorContext
  ): Promise<Credential> {
    if (actorContext?.organizationId && actorContext.organizationId !== input.organizationId) {
      throw badRequest("Forbidden: Organization mismatch", "FORBIDDEN");
    }

    const eligibility = await this.checkDegreeEligibility(input.candidateId, "BTECH");
    if (!eligibility.isEligible) {
      throw badRequest(
        `Candidate is not eligible for B.Tech Degree: ${eligibility.ineligibilityReasons.join("; ")}`,
        "INELIGIBLE_FOR_DEGREE"
      );
    }

    const semesterCredentialIds = eligibility.semesters.map((s) => s.credentialId!);

    const degreePayload: BTechDegreePayload = {
      programType: "BTECH",
      programName: input.programName || eligibility.programName,
      degreeTitle: input.degreeTitle || "Bachelor of Technology",
      totalSemesters: 8,
      cumulativeGpa: eligibility.cumulativeGpa,
      totalCreditsEarned: eligibility.totalCreditsEarned,
      classification: eligibility.projectedClassification,
      semesterCredentialIds,
      graduationDate: input.graduationDate || new Date().toISOString().slice(0, 10),
      issueYear: new Date().getFullYear().toString()
    };

    // Concurrency Hardening: Use PostgreSQL transaction advisory lock on candidate to serialize simultaneous requests
    const draft = await withTransaction(this.pool, async (client) => {
      // 1. Acquire transaction-level advisory lock on candidate ID
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`degree_issuance_${input.candidateId}`]);

      // 2. Re-check for active degree inside locked transaction
      const existingRes = await client.query(
        "SELECT id, credential_number FROM credentials WHERE candidate_id = $1 AND credential_type = 'BTECH_DEGREE' AND status <> 'REVOKED'",
        [input.candidateId]
      );
      if (existingRes.rows.length > 0) {
        throw badRequest(
          `B.Tech Degree has already been issued for this candidate (Credential #${existingRes.rows[0].credential_number})`,
          "DEGREE_ALREADY_ISSUED"
        );
      }

      // 3. Verify candidate & organization ownership
      const candRes = await client.query("SELECT id, organization_id FROM candidates WHERE id = $1", [input.candidateId]);
      if (candRes.rows.length === 0) throw notFound("Candidate");
      if (candRes.rows[0].organization_id !== input.organizationId) {
        throw badRequest("Candidate does not belong to the issuing organization", "INVALID_ORGANIZATION");
      }

      const credentialNumber = `CC-DEG-BTECH-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

      const RepoClass = this.repo.constructor as new (db: DatabaseClient) => CredentialRepository;
      const AuditRepoClass = this.auditRepo.constructor as new (db: DatabaseClient) => AuditRepository;
      const txRepo = new RepoClass(client);
      const txAuditRepo = new AuditRepoClass(client);

      const created = await txRepo.createDraft({
        credentialNumber,
        credentialType: "BTECH_DEGREE",
        candidateId: input.candidateId,
        organizationId: input.organizationId,
        credentialPayload: degreePayload as unknown as JsonObject
      });

      for (const semCredId of semesterCredentialIds) {
        await txRepo.createRelationship({
          sourceCredentialId: created.id,
          targetCredentialId: semCredId,
          relationshipType: "DERIVED_FROM"
        });
      }

      await txAuditRepo.create({
        organizationId: input.organizationId,
        actorUserId: input.issuerUserId || actorContext?.userId || null,
        entityType: "credential",
        entityId: created.id,
        eventType: "CREDENTIAL_CREATED",
        eventMetadata: { credentialType: "BTECH_DEGREE", credentialNumber }
      });

      return created;
    });

    // Finalize the degree and submit to blockchain
    const finalized = await this.finalize(draft.id, actorContext);

    // Register on-chain relationships for all 8 semesters
    if (this.blockchainService) {
      for (const semCredId of semesterCredentialIds) {
        try {
          await this.blockchainService.addCredentialRelationship(
            finalized.id,
            semCredId,
            "DERIVED_FROM"
          );
        } catch (relErr) {
          console.error(`On-chain degree relationship linking note: ${(relErr as Error).message}`);
        }
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
      return { status: "REVOKED", degreeStatus: credential.status };
    }

    if (credential.status === "DRAFT") {
      return { status: "INVALID", degreeStatus: credential.status };
    }

    const canonical = mapToCanonical(credential);
    const computedHash = hashCanonicalCredential(canonical);
    const dbHash = credential.canonicalHash;

    if (computedHash !== dbHash) {
      return {
        status: "TAMPERED",
        degreeStatus: credential.status,
        hashMismatch: true,
        dbHash,
        computedHash
      };
    }

    let rootStatus: VerificationStatus = "PENDING_BLOCKCHAIN";
    let blockchainHash: string | null = null;
    let issuerAddress: string | null = null;

    if (this.blockchainService) {
      try {
        const proof = await this.blockchainService.getCredential(id);

        if (!proof) {
          rootStatus = "PENDING_BLOCKCHAIN";
        } else if (proof.status === 2) {
          return { status: "REVOKED", degreeStatus: credential.status };
        } else {
          const computedHashWithPrefix = computedHash.startsWith("0x") ? computedHash : `0x${computedHash}`;
          if (proof.documentHash !== computedHashWithPrefix) {
            return {
              status: "TAMPERED",
              degreeStatus: credential.status,
              hashMismatch: true,
              dbHash,
              computedHash,
              blockchainHash: proof.documentHash
            };
          }

          // Provenance Verification: Verify that the proof issuer is an authorized issuer on-chain
          const isAuthorizedIssuer = await this.blockchainService.verifyIssuerProvenance(proof.issuer);
          if (!isAuthorizedIssuer) {
            return {
              status: "UNTRUSTED_ISSUER",
              degreeStatus: credential.status,
              dbHash,
              computedHash,
              blockchainHash: proof.documentHash,
              issuerAddress: proof.issuer
            };
          }

          rootStatus = "VERIFIED";
          blockchainHash = proof.documentHash;
          issuerAddress = proof.issuer;
        }
      } catch (err: unknown) {
        const error = err as Error;
        console.error(`Error reading from blockchain for verification: ${error.message}`);
        rootStatus = "PENDING_BLOCKCHAIN";
      }
    }

    // If credential is a B.Tech Degree, recursively verify its 8 constituent semesters
    if (credential.credentialType === "BTECH_DEGREE") {
      const payload = credential.credentialPayload as unknown as BTechDegreePayload;
      const semIds = Array.isArray(payload.semesterCredentialIds) ? payload.semesterCredentialIds : [];

      const constituentSemesters: ConstituentSemesterVerification[] = [];
      const chainIssues: string[] = [];

      for (let i = 0; i < semIds.length; i++) {
        const semId = semIds[i];
        const semCred = await this.repo.findById(semId);

        if (!semCred) {
          chainIssues.push(`Constituent semester ${i + 1} record not found (${semId})`);
          constituentSemesters.push({
            semesterNumber: i + 1,
            credentialId: semId,
            credentialNumber: "UNKNOWN",
            status: "NOT_FOUND",
            isPassed: false,
            semesterGpa: 0,
            credits: 0
          });
          continue;
        }

        const semVerify = await this.verify(semCred.id);
        const semPayload = semCred.credentialPayload;
        const semNum = typeof semPayload.semester === "number" ? semPayload.semester : i + 1;
        const isPassed = semPayload.result === "PASS";
        const semGpa = typeof semPayload.semesterGpa === "number" ? semPayload.semesterGpa : 0;
        const subjects = Array.isArray(semPayload.subjects) ? (semPayload.subjects as RawSubject[]) : [];
        const credits = subjects.reduce((sum: number, s: RawSubject) => sum + (Number(s.credits) || 0), 0);

        if (semVerify.status !== "VERIFIED" && semVerify.status !== "PENDING_BLOCKCHAIN") {
          chainIssues.push(`Semester ${semNum} verification failed with status: ${semVerify.status}`);
        }
        if (!isPassed) {
          chainIssues.push(`Semester ${semNum} has non-passing result status`);
        }

        constituentSemesters.push({
          semesterNumber: semNum,
          credentialId: semCred.id,
          credentialNumber: semCred.credentialNumber,
          status: semVerify.status,
          isPassed,
          semesterGpa: semGpa,
          credits,
          hashMismatch: semVerify.hashMismatch,
          dbHash: semVerify.dbHash,
          blockchainHash: semVerify.blockchainHash
        });
      }

      const isChainValid = chainIssues.length === 0 && constituentSemesters.length === 8;
      const verifiedSemestersCount = constituentSemesters.filter((s) => s.status === "VERIFIED" || s.status === "PENDING_BLOCKCHAIN").length;

      const affectedPrerequisites: AffectedPrerequisite[] = constituentSemesters
        .filter((s) => s.status === "REVOKED")
        .map((s) => ({
          semesterNumber: s.semesterNumber,
          credentialId: s.credentialId,
          credentialNumber: s.credentialNumber,
          status: s.status,
          reason: `Prerequisite Semester ${s.semesterNumber} marksheet has been officially REVOKED`
        }));

      // Revocation semantics: Distinguish degree itself revoked vs degree with revoked prerequisite
      let finalDegreeStatus: VerificationStatus = rootStatus;
      if (constituentSemesters.some((s) => s.status === "REVOKED")) {
        finalDegreeStatus = "ISSUED_WITH_REVOKED_PREREQUISITE";
      } else if (constituentSemesters.some((s) => s.status === "TAMPERED")) {
        finalDegreeStatus = "TAMPERED";
      } else if (constituentSemesters.some((s) => s.status === "UNTRUSTED_ISSUER")) {
        finalDegreeStatus = "UNTRUSTED_ISSUER";
      }

      return {
        status: finalDegreeStatus,
        degreeStatus: credential.status,
        affectedPrerequisites: affectedPrerequisites.length > 0 ? affectedPrerequisites : undefined,
        dbHash,
        computedHash,
        blockchainHash,
        issuerAddress,
        degreeDetails: {
          programName: payload.programName || "Bachelor of Technology",
          degreeTitle: payload.degreeTitle || "Bachelor of Technology",
          cumulativeGpa: payload.cumulativeGpa || 0,
          totalCreditsEarned: payload.totalCreditsEarned || 0,
          classification: payload.classification || "PASS",
          totalSemesters: 8
        },
        chainVerification: {
          isChainValid,
          totalConstituentSemesters: semIds.length,
          verifiedSemestersCount,
          constituentSemesters,
          chainIssues
        }
      };
    }

    return {
      status: rootStatus,
      degreeStatus: credential.status,
      dbHash,
      computedHash,
      blockchainHash,
      issuerAddress
    };
  }

  async revoke(
    id: string,
    reasonCode: string,
    note?: string,
    actorContext?: ActorContext | string
  ): Promise<Credential> {
    const credential = await this.repo.findById(id);
    if (!credential) throw notFound("Credential");

    const orgId = typeof actorContext === "object" ? actorContext?.organizationId : undefined;
    const actorUserId = typeof actorContext === "object" ? actorContext?.userId : actorContext;

    if (orgId && credential.organizationId !== orgId) {
      throw badRequest("Forbidden: Credential belongs to a different organization", "FORBIDDEN");
    }

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

  async getRelationships(credentialId: string): Promise<CredentialRelationship[]> {
    return this.repo.getRelationships(credentialId);
  }

  async getStats(organizationId?: string): Promise<{
    totalCandidates: number;
    totalCredentials: number;
    issuedCredentials: number;
    draftCredentials: number;
    revokedCredentials: number;
  }> {
    const orgFilter = organizationId ? "WHERE organization_id = $1" : "";
    const orgParams = organizationId ? [organizationId] : [];

    const credOrgFilter = organizationId ? "WHERE organization_id = $1" : "";

    const candRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM candidates ${orgFilter}`,
      orgParams
    );

    const credRes = await this.pool.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*)::text as count FROM credentials ${credOrgFilter} GROUP BY status`,
      orgParams
    );

    let totalCredentials = 0;
    let issuedCredentials = 0;
    let draftCredentials = 0;
    let revokedCredentials = 0;

    for (const row of credRes.rows) {
      const count = parseInt(row.count, 10) || 0;
      totalCredentials += count;
      if (row.status === "ISSUED" || row.status === "FINALIZED") {
        issuedCredentials += count;
      } else if (row.status === "DRAFT") {
        draftCredentials += count;
      } else if (row.status === "REVOKED") {
        revokedCredentials += count;
      }
    }

    return {
      totalCandidates: parseInt(candRes.rows[0]?.count || "0", 10) || 0,
      totalCredentials,
      issuedCredentials,
      draftCredentials,
      revokedCredentials
    };
  }

  async getAuditLogs(filters: { organizationId?: string; entityId?: string; limit?: number } = {}): Promise<AuditLog[]> {
    return this.auditRepo.list(filters);
  }
}
