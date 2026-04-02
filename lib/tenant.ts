import { notFound } from "next/navigation";

import { query } from "@/lib/db";
import type { TenantContext } from "@/lib/types";

export async function getTenantBySlug(tenantSlug: string): Promise<TenantContext | null> {
  const result = await query<{
    id: string;
    slug: string;
    name: string;
    timezone: string;
  }>(
    `
      SELECT id, slug, name, timezone
      FROM tenants
      WHERE slug = $1 AND is_active = true
      LIMIT 1
    `,
    [tenantSlug]
  );

  const row = result.rows[0];
  if (!row) {
    return null;
  }

  return {
    tenantId: row.id,
    tenantSlug: row.slug,
    tenantName: row.name,
    timezone: row.timezone
  };
}

export async function requireTenantBySlug(tenantSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    notFound();
  }
  return tenant;
}
