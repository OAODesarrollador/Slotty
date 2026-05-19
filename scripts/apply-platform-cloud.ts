import crypto from "node:crypto";
import fs from "node:fs/promises";

import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { hashPassword } from "@/lib/auth";
import { getPool } from "@/lib/db";

const PLATFORM_ADMIN_EMAIL = "platform@dibok.test";
const migrationFiles = [
  "database/migrations/2026-05-18-platform-users.sql",
  "database/migrations/2026-05-18-platform-audit-logs.sql",
  "database/migrations/2026-05-18-tenant-saas-fields.sql"
];

async function main() {
  const cloudUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;
  if (!cloudUrl) {
    throw new Error("POSTGRES_URL_NON_POOLING o POSTGRES_URL no esta configurada.");
  }

  process.env.DATABASE_URL = cloudUrl;
  const password = `${crypto.randomBytes(18).toString("base64url")}Aa1!`;
  const pool = getPool();

  for (const file of migrationFiles) {
    const sql = await fs.readFile(file, "utf8");
    await pool.query(sql);
    console.log(`applied ${file}`);
  }

  await pool.query(
    `
      INSERT INTO platform_users (role, email, password_hash, display_name, is_active)
      VALUES ('platform_admin', $1, $2, $3, true)
      ON CONFLICT (email) DO UPDATE
      SET role = 'platform_admin',
          password_hash = EXCLUDED.password_hash,
          display_name = EXCLUDED.display_name,
          is_active = true,
          updated_at = now()
    `,
    [PLATFORM_ADMIN_EMAIL, hashPassword(password), "Admin Plataforma"]
  );

  const verification = await pool.query<{
    platform_tables: string;
    tenant_columns: string;
    admin_users: string;
  }>(
    `
      SELECT
        (SELECT count(*) FROM information_schema.tables WHERE table_name IN ('platform_users', 'platform_audit_logs'))::text AS platform_tables,
        (
          SELECT count(*)
          FROM information_schema.columns
          WHERE table_name = 'tenants'
            AND column_name IN ('status', 'plan', 'billing_status', 'suspended_at', 'cancelled_at', 'trial_ends_at')
        )::text AS tenant_columns,
        (SELECT count(*) FROM platform_users WHERE email = $1 AND is_active = true)::text AS admin_users
    `,
    [PLATFORM_ADMIN_EMAIL]
  );

  await pool.end();

  console.log(`verification ${JSON.stringify(verification.rows[0])}`);
  console.log(`CLOUD_PLATFORM_EMAIL=${PLATFORM_ADMIN_EMAIL}`);
  console.log(`CLOUD_PLATFORM_PASSWORD=${password}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
