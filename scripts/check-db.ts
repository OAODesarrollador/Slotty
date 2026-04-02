import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import fs from "node:fs/promises";
import path from "node:path";

import { getPool } from "@/lib/db";

async function main() {
  const schema = await fs.readFile(path.join(process.cwd(), "database", "schema.sql"), "utf8");
  const pool = getPool();
  await pool.query(schema);
  console.log("Schema aplicado correctamente.");
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
