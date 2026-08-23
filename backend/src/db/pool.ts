import pg from "pg";
import { loadEnv } from "../config/env.js";

const { Pool } = pg;

export type DatabaseClient = Pick<pg.Pool, "query">;
export type TransactionalDatabase = pg.Pool;

export function createPool(connectionString = loadEnv().DATABASE_URL): pg.Pool {
  return new Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    allowExitOnIdle: false
  });
}

export async function verifyDatabaseConnection(database: DatabaseClient): Promise<void> {
  await database.query("SELECT 1");
}

export async function withTransaction<T>(
  database: TransactionalDatabase,
  callback: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await database.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
