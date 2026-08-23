import { expect } from "chai";
import { ethers } from "hardhat";

function id(value: string): string {
  return ethers.id(value);
}

describe("CredentialRegistry", () => {
  async function deployFixture() {
    const [admin, issuer, verifier, outsider] = await ethers.getSigners();
    const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
    const registry = await CredentialRegistry.deploy(admin.address);
    await registry.waitForDeployment();

    const issuerRole = await registry.ISSUER_ROLE();
    const revokerRole = await registry.REVOKER_ROLE();
    await registry.grantRole(issuerRole, issuer.address);
    await registry.grantRole(revokerRole, issuer.address);

    return { registry, admin, issuer, verifier, outsider };
  }

  it("allows authorized issuers to register and verify credential proofs", async () => {
    const { registry, issuer } = await deployFixture();
    const credentialId = id("credchain:credential:sem-1");
    const documentHash = id("canonical-semester-1");
    const credentialType = id("BTECH_SEMESTER_MARKSHEET");

    await expect(registry.connect(issuer).registerCredential(credentialId, documentHash, credentialType))
      .to.emit(registry, "CredentialRegistered")
      .withArgs(credentialId, documentHash, credentialType, issuer.address);

    expect(await registry.verifyCredential(credentialId, documentHash)).to.equal(true);
    expect(await registry.isCredentialValid(credentialId)).to.equal(true);
  });

  it("blocks unauthorized credential registration", async () => {
    const { registry, outsider } = await deployFixture();

    await expect(
      registry
        .connect(outsider)
        .registerCredential(id("credchain:credential:sem-1"), id("hash"), id("type")),
    ).to.be.revertedWithCustomError(registry, "AccessControlUnauthorizedAccount");
  });

  it("returns false when a document hash is tampered", async () => {
    const { registry, issuer } = await deployFixture();
    const credentialId = id("credchain:credential:sem-1");
    const documentHash = id("canonical-semester-1");

    await registry.connect(issuer).registerCredential(credentialId, documentHash, id("BTECH_SEMESTER_MARKSHEET"));

    expect(await registry.verifyCredential(credentialId, id("tampered-semester-1"))).to.equal(false);
  });

  it("revokes active credentials without writing detailed PII on-chain", async () => {
    const { registry, issuer } = await deployFixture();
    const credentialId = id("credchain:credential:sem-1");
    const documentHash = id("canonical-semester-1");

    await registry.connect(issuer).registerCredential(credentialId, documentHash, id("BTECH_SEMESTER_MARKSHEET"));

    await expect(registry.connect(issuer).revokeCredential(credentialId, id("ADMINISTRATIVE_REVOCATION")))
      .to.emit(registry, "CredentialRevoked")
      .withArgs(credentialId, issuer.address, id("ADMINISTRATIVE_REVOCATION"));

    expect(await registry.verifyCredential(credentialId, documentHash)).to.equal(false);
    expect(await registry.isCredentialValid(credentialId)).to.equal(false);
  });

  it("links active credentials through generic relationships", async () => {
    const { registry, issuer } = await deployFixture();
    const sem1 = id("credchain:credential:sem-1");
    const sem2 = id("credchain:credential:sem-2");

    await registry.connect(issuer).registerCredential(sem1, id("canonical-semester-1"), id("BTECH_SEMESTER_MARKSHEET"));
    await registry.connect(issuer).registerCredential(sem2, id("canonical-semester-2"), id("BTECH_SEMESTER_MARKSHEET"));

    await expect(registry.connect(issuer).addCredentialRelationship(sem2, sem1, 0))
      .to.emit(registry, "CredentialRelationshipAdded")
      .withArgs(sem2, sem1, 0);

    const relationships = await registry.getCredentialRelationships(sem2);
    expect(relationships).to.have.lengthOf(1);
    expect(relationships[0].sourceCredentialId).to.equal(sem2);
    expect(relationships[0].targetCredentialId).to.equal(sem1);
  });
});

