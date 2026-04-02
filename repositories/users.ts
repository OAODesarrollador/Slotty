import { query } from "@/lib/db";

export async function getUserByCredentials(tenantId: string, email: string) {
  const result = await query<{
    id: string;
    tenant_id: string;
    email: string;
    display_name: string;
    role: "owner" | "staff" | "barber" | "platform_admin";
    password_hash: string;
    slug: string;
  }>(
    `
      SELECT u.id, u.tenant_id, u.email, u.display_name, u.role, u.password_hash, t.slug
      FROM users u
      INNER JOIN tenants t ON t.id = u.tenant_id
      WHERE u.tenant_id = $1
        AND lower(u.email) = lower($2)
        AND u.is_active = true
      LIMIT 1
    `,
    [tenantId, email]
  );

  return result.rows[0] ?? null;
}
