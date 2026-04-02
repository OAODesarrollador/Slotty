import fs from "node:fs/promises";
import path from "node:path";

import dotenv from "dotenv";

async function ensureEnvFile() {
  const envLocalPath = path.join(process.cwd(), ".env.local");
  const envExamplePath = path.join(process.cwd(), ".env.example");

  try {
    await fs.access(envLocalPath);
  } catch {
    const example = await fs.readFile(envExamplePath, "utf8");
    await fs.writeFile(envLocalPath, example, "utf8");
    console.log("[dev:setup] .env.local creado desde .env.example");
  }

  dotenv.config({ path: envLocalPath });
}

async function main() {
  await ensureEnvFile();

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta configurada en .env.local");
  }

  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET no esta configurada en .env.local");
  }

  const { main: seedMain } = await import("./seed-runner");
  await seedMain();
  console.log("[dev:setup] Base inicializada.");
}

main().catch((error) => {
  console.error("[dev:setup]", error);
  process.exit(1);
});
