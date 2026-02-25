import { Pool, QueryResult } from "pg";
import { env } from "../config/env.js";

export const pool = new Pool({
  connectionString: env.databaseUrl
});

export async function query<T = unknown>(text: string, values?: unknown[]): Promise<QueryResult<T>> {
  return pool.query<T>(text, values);
}
