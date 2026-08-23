import { loadEnv } from "./config/env.js";
import { createPool, verifyDatabaseConnection } from "./db/pool.js";
import { buildApp } from "./http/app.js";

const env = loadEnv();
const pool = createPool(env.DATABASE_URL);

try {
  await verifyDatabaseConnection(pool);
  const app = await buildApp({ database: pool });

  app.addHook("onClose", async () => {
    await pool.end();
  });

  await app.listen({
    host: "0.0.0.0",
    port: env.BACKEND_PORT
  });
} catch (error) {
  await pool.end().catch(() => undefined);
  const message = error instanceof Error ? error.message : "unknown startup error";
  console.error(`Failed to start CredChain backend: ${message}`);
  process.exit(1);
}
