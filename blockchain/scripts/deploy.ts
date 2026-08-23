import { ethers } from "hardhat";

async function main(): Promise<void> {
  const [deployer] = await ethers.getSigners();
  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const registry = await CredentialRegistry.deploy(deployer.address);

  await registry.waitForDeployment();

  console.log(`CredentialRegistry deployed to ${await registry.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

