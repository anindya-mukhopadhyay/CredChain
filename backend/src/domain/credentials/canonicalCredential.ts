import { sha256Hex } from "../../lib/hash.js";
import type { CanonicalCredential } from "./types.js";

type JsonValue = null | boolean | number | string | JsonValue[] | { [key: string]: JsonValue };

function sortObject(value: JsonValue): JsonValue {
  if (Array.isArray(value)) {
    return value.map(sortObject);
  }

  if (value !== null && typeof value === "object") {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, JsonValue>>((sorted, key) => {
        sorted[key] = sortObject(value[key]);
        return sorted;
      }, {});
  }

  return value;
}

export function canonicalizeCredential(credential: CanonicalCredential): string {
  return JSON.stringify(sortObject(credential as unknown as JsonValue));
}

export function hashCanonicalCredential(credential: CanonicalCredential): string {
  return sha256Hex(canonicalizeCredential(credential));
}

