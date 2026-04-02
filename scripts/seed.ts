import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { getPool } from "@/lib/db";
import { main as seedMain } from "./seed-runner";

async function main() {
  const pool = getPool();
  await seedMain();
  await pool.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
