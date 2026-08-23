import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  BACKEND_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  APP_BASE_URL: z.string().url().default("http://localhost:3000"),
  RPC_URL: z.string().url().default("http://127.0.0.1:8545"),
  CHAIN_ID: z.coerce.number().int().positive().default(31337),
  CREDENTIAL_REGISTRY_ADDRESS: z.string().optional(),
  DOCUMENT_STORAGE_ROOT: z.string().default("./storage")
});

const databaseEnvSchema = envSchema.pick({
  DATABASE_URL: true
});

export type AppEnv = z.infer<typeof envSchema>;
export type DatabaseEnv = z.infer<typeof databaseEnvSchema>;

export function loadEnv(input: NodeJS.ProcessEnv = process.env): AppEnv {
  return envSchema.parse(input);
}

export function loadDatabaseEnv(input: NodeJS.ProcessEnv = process.env): DatabaseEnv {
  return databaseEnvSchema.parse(input);
}
