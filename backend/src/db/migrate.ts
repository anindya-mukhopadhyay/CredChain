import { readFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { loadDatabaseEnv } from "../config/env.js";

const { Pool } = pg;

const migrations = [
  "001_initial_schema.sql",
  "002_add_credential_payload.sql",
  "003_degree_uniqueness.sql"
];

function migrationPath(fileName: string): string {
  const currentDir = fileURLToPath(new URL(".", import.meta.url));
  return join(currentDir, "../../../database/migrations", fileName);
}

async function migrate(): Promise<void> {
  const env = loadDatabaseEnv();
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    for (const fileName of migrations) {
      const version = basename(fileName, ".sql");
      const existing = await client.query("SELECT 1 FROM schema_migrations WHERE version = $1", [
        version
      ]);

      if (existing.rowCount === 0) {
        const sql = await readFile(migrationPath(fileName), "utf8");
        await client.query(sql);
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [version]);
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

await migrate();
