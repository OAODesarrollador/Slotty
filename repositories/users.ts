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

export async function listTenantUsers(tenantId: string) {
  const result = await query<{
    id: string;
    email: string;
    display_name: string;
    role: "owner" | "staff" | "barber" | "platform_admin";
    is_active: boolean;
    created_at: string;
  }>(
    `
      SELECT id, email, display_name, role, is_active, created_at
      FROM users
      WHERE tenant_id = $1
        AND role IN ('owner', 'staff')
      ORDER BY is_active DESC, role ASC, display_name ASC
    `,
    [tenantId]
  );

  return result.rows;
}

export async function getTenantUserPasswordHash(tenantId: string, userId: string) {
  const result = await query<{
    id: string;
    password_hash: string;
    role: "owner" | "staff" | "barber" | "platform_admin";
  }>(
    `
      SELECT id, password_hash, role
      FROM users
      WHERE tenant_id = $1
        AND id = $2
        AND is_active = true
      LIMIT 1
    `,
    [tenantId, userId]
  );

  return result.rows[0] ?? null;
}

export async function createTenantUser(input: {
  tenantId: string;
  email: string;
  displayName: string;
  role: "owner" | "staff";
  passwordHash: string;
}) {
  await query(
    `
      INSERT INTO users (
        tenant_id,
        role,
        email,
        password_hash,
        display_name,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, true, now(), now())
    `,
    [input.tenantId, input.role, input.email, input.passwordHash, input.displayName]
  );
}

export async function updateTenantUser(input: {
  tenantId: string;
  userId: string;
  email: string;
  displayName: string;
  role: "owner" | "staff";
  passwordHash?: string | null;
  isActive: boolean;
}) {
  await query(
    `
      UPDATE users
      SET email = $3,
          display_name = $4,
          role = $5,
          password_hash = COALESCE($6, password_hash),
          is_active = $7,
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
    `,
    [
      input.tenantId,
      input.userId,
      input.email,
      input.displayName,
      input.role,
      input.passwordHash ?? null,
      input.isActive
    ]
  );
}

export async function deactivateTenantUser(tenantId: string, userId: string) {
  await query(
    `
      UPDATE users
      SET is_active = false,
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
    `,
    [tenantId, userId]
  );
}
