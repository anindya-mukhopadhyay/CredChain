import { createHash } from "node:crypto";

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

export function sha256Bytes32(input: string | Buffer): `0x${string}` {
  return `0x${sha256Hex(input)}`;
}

