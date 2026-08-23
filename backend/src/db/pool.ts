import pg from "pg";
import { loadEnv } from "../config/env.js";

const { Pool } = pg;

export function createPool(connectionString = loadEnv().DATABASE_URL): pg.Pool {
  return new Pool({
    connectionString,
    max: 10
  });
}

