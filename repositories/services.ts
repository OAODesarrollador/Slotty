import { query } from "@/lib/db";

export async function listPublicServices(tenantId: string) {
  const result = await query<{
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: string;
  }>(
    `
      SELECT id, name, description, duration_minutes, price::text AS price
      FROM services
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY sort_order ASC, name ASC
    `,
    [tenantId]
  );

  return result.rows;
}

export async function getServiceById(tenantId: string, serviceId: string) {
  const result = await query<{
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: string;
  }>(
    `
      SELECT id, name, description, duration_minutes, price::text AS price
      FROM services
      WHERE tenant_id = $1 AND id = $2 AND is_active = true
      LIMIT 1
    `,
    [tenantId, serviceId]
  );

  return result.rows[0] ?? null;
}
