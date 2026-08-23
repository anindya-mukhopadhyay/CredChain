import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";
import { z } from "zod";

for (const envPath of [resolve(process.cwd(), ".env"), resolve(process.cwd(), "../.env")]) {
  if (existsSync(envPath)) {
    config({ path: envPath, override: false });
  }
}

const DEV_PLACEHOLDER_SECRETS = [
  "local-development-jwt-secret-change-before-production",
  "replace-with-a-long-random-value",
  "replace-with-a-cryptographically-secure-random-32-character-secret-in-production"
];

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    BACKEND_PORT: z.coerce.number().int().positive().default(4000),
    DATABASE_URL: z.string().url(),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
    APP_BASE_URL: z.string().url().default("http://localhost:3000"),
    RPC_URL: z.string().url().default("http://127.0.0.1:8545"),
    CHAIN_ID: z.coerce.number().int().positive().default(31337),
    CREDENTIAL_REGISTRY_ADDRESS: z.string().optional(),
    DEPLOYER_PRIVATE_KEY: z.string().optional(),
    ENABLE_DEMO_SEED: z.string().optional().transform((val) => val === "true"),
    DOCUMENT_STORAGE_ROOT: z.string().default("./storage")
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      // 1. Guard against development JWT placeholders in production
      if (DEV_PLACEHOLDER_SECRETS.includes(data.JWT_SECRET)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["JWT_SECRET"],
          message: "Production requires a unique, non-placeholder cryptographic JWT_SECRET"
        });
      }

      // 2. Guard against missing or invalid contract address in production
      if (!data.CREDENTIAL_REGISTRY_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(data.CREDENTIAL_REGISTRY_ADDRESS)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["CREDENTIAL_REGISTRY_ADDRESS"],
          message: "Production requires a valid 42-character hex CREDENTIAL_REGISTRY_ADDRESS (0x...)"
        });
      }

      // 3. Guard against missing or invalid deployer private key in production
      if (!data.DEPLOYER_PRIVATE_KEY || !/^0x[a-fA-F0-9]{64}$/.test(data.DEPLOYER_PRIVATE_KEY)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["DEPLOYER_PRIVATE_KEY"],
          message: "Production requires a valid 66-character hex DEPLOYER_PRIVATE_KEY (0x...)"
        });
      }
    }
  });

const databaseEnvSchema = z.object({
  DATABASE_URL: z.string().url()
});

export type AppEnv = z.infer<typeof envSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(input);
}

export function loadDatabaseEnv(input: NodeJS.ProcessEnv = process.env): DatabaseEnv {
  return databaseEnvSchema.parse(input);
}
