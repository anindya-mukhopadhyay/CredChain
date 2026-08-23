import { ethers } from "ethers";
import { badRequest } from "../../errors/apiError.js";

const CREDENTIAL_REGISTRY_ABI = [
  "function registerCredential(bytes32 credentialId, bytes32 documentHash, bytes32 credentialType) external",
  "function verifyCredential(bytes32 credentialId, bytes32 documentHash) external view returns (bool)",
  "function isCredentialValid(bytes32 credentialId) external view returns (bool)",
  "function getCredential(bytes32 credentialId) external view returns (tuple(bytes32 documentHash, bytes32 credentialType, address issuer, uint64 issuedAt, uint8 status))",
  "function revokeCredential(bytes32 credentialId, bytes32 reasonCode) external",
  "function addCredentialRelationship(bytes32 sourceCredentialId, bytes32 targetCredentialId, uint8 relationshipType) external"
];

export type BlockchainCredentialProof = {
  documentHash: string;
  credentialType: string;
  issuer: string;
  issuedAt: bigint;
  status: number; // 0 = None, 1 = Active, 2 = Revoked
};

export class BlockchainService {
  private readonly provider: ethers.JsonRpcProvider | null = null;
  private readonly wallet: ethers.ContractRunner | null = null;
  public readonly contractAddress: string | null = null;

  constructor(
    rpcUrl?: string,
    contractAddress?: string,
    privateKey?: string
  ) {
    if (rpcUrl) {
      this.provider = new ethers.JsonRpcProvider(rpcUrl);
    }
    if (contractAddress) {
      this.contractAddress = contractAddress;
    }
    if (privateKey && this.provider) {
      const baseWallet = new ethers.Wallet(privateKey, this.provider);
      this.wallet = new ethers.NonceManager(baseWallet);
    }
  }

  private getContract(write = false): ethers.Contract {
    if (!this.contractAddress) {
      throw badRequest("Blockchain contract address is not configured", "BLOCKCHAIN_NOT_CONFIGURED");
    }

    if (write) {
      if (!this.wallet) {
        throw badRequest("Blockchain issuer private key is not configured", "BLOCKCHAIN_WRITE_NOT_CONFIGURED");
      }
      return new ethers.Contract(this.contractAddress, CREDENTIAL_REGISTRY_ABI, this.wallet);
    }

    if (!this.provider) {
      throw badRequest("Blockchain provider RPC URL is not configured", "BLOCKCHAIN_NOT_CONFIGURED");
    }

    return new ethers.Contract(this.contractAddress, CREDENTIAL_REGISTRY_ABI, this.provider);
  }

  async registerCredential(
    credentialId: string,
    documentHash: string,
    credentialType: string
  ): Promise<string> {
    const contract = this.getContract(true);
    const cleanHash = documentHash.startsWith("0x") ? documentHash : `0x${documentHash}`;
    const tx = await contract.registerCredential(
      ethers.id(credentialId),
      cleanHash,
      ethers.id(credentialType)
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }

  async getCredential(credentialId: string): Promise<BlockchainCredentialProof | null> {
    try {
      const contract = this.getContract(false);
      const proof = await contract.getCredential(ethers.id(credentialId));
      return {
        documentHash: proof.documentHash,
        credentialType: proof.credentialType,
        issuer: proof.issuer,
        issuedAt: proof.issuedAt,
        status: Number(proof.status)
      };
    } catch (error: unknown) {
      const err = error as Error;
      // If error contains "CredentialNotFound" or status is None
      if (err.message && (err.message.includes("CredentialNotFound") || err.message.includes("0x546e3001"))) {
        return null;
      }
      throw error;
    }
  }

  async verifyCredential(credentialId: string, documentHash: string): Promise<boolean> {
    const contract = this.getContract(false);
    const cleanHash = documentHash.startsWith("0x") ? documentHash : `0x${documentHash}`;
    return contract.verifyCredential(ethers.id(credentialId), cleanHash);
  }

  async revokeCredential(credentialId: string, reasonCode: string): Promise<string> {
    const contract = this.getContract(true);
    const tx = await contract.revokeCredential(
      ethers.id(credentialId),
      ethers.id(reasonCode)
    );
    const receipt = await tx.wait();
    return receipt.hash;
  }
}
