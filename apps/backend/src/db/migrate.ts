import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pool } from "./client.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationsDir = path.resolve(__dirname, "../../migrations");

async function run() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    const appliedRows = await client.query<{ filename: string }>("SELECT filename FROM schema_migrations");
    const applied = new Set(appliedRows.rows.map((row) => row.filename));

    const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();
    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }
      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations(filename) VALUES ($1)", [file]);
      console.log(`Applied migration: ${file}`);
    }
    await client.query("COMMIT");
    console.log("Migrations complete");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("⚠️  Migration failed — server will still start but DB may be uninitialized:", error);
    process.exitCode = 0; // non-fatal: let server start so we can see logs
  } finally {
    client.release();
    await pool.end();
  }
}

run();
