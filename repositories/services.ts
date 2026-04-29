import { query } from "@/lib/db";

export async function listPublicServices(tenantId: string) {
  const result = await query<{
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: string;
    is_promotion: boolean;
  }>(
    `
      SELECT id, name, description, duration_minutes, price::text AS price, is_promotion
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
    is_promotion: boolean;
  }>(
    `
      SELECT id, name, description, duration_minutes, price::text AS price, is_promotion
      FROM services
      WHERE tenant_id = $1 AND id = $2 AND is_active = true
      LIMIT 1
    `,
    [tenantId, serviceId]
  );

  return result.rows[0] ?? null;
}

export async function listAdminServices(tenantId: string) {
  const result = await query<{
    id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: string;
    is_promotion: boolean;
    sort_order: number;
    is_active: boolean;
  }>(
    `
      SELECT id, name, description, duration_minutes, price::text AS price, is_promotion, sort_order, is_active
      FROM services
      WHERE tenant_id = $1
      ORDER BY is_active DESC, sort_order ASC, name ASC
    `,
    [tenantId]
  );

  return result.rows;
}

export async function createService(input: {
  tenantId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  sortOrder: number;
  isPromotion: boolean;
}) {
  await query(
    `
      INSERT INTO services (
        tenant_id,
        name,
        description,
        duration_minutes,
        price,
        is_promotion,
        sort_order,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true, now(), now())
    `,
    [
      input.tenantId,
      input.name,
      input.description ?? null,
      input.durationMinutes,
      input.price,
      input.isPromotion,
      input.sortOrder
    ]
  );
}

export async function updateService(input: {
  tenantId: string;
  serviceId: string;
  name: string;
  description?: string | null;
  durationMinutes: number;
  price: number;
  sortOrder: number;
  isPromotion: boolean;
  isActive: boolean;
}) {
  await query(
    `
      UPDATE services
      SET name = $3,
          description = $4,
          duration_minutes = $5,
          price = $6,
          is_promotion = $7,
          sort_order = $8,
          is_active = $9,
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
    `,
    [
      input.tenantId,
      input.serviceId,
      input.name,
      input.description ?? null,
      input.durationMinutes,
      input.price,
      input.isPromotion,
      input.sortOrder,
      input.isActive
    ]
  );
}

export async function archiveService(tenantId: string, serviceId: string) {
  await query(
    `
      UPDATE services
      SET is_active = false,
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
    `,
    [tenantId, serviceId]
  );
}
