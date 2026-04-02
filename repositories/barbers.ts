import { query } from "@/lib/db";

export async function listBarbersForService(tenantId: string, serviceId: string) {
  const result = await query<{
    id: string;
    full_name: string;
    rating: string;
  }>(
    `
      SELECT b.id, b.full_name, b.rating::text AS rating
      FROM barbers b
      INNER JOIN barber_services bs
        ON bs.barber_id = b.id
       AND bs.tenant_id = b.tenant_id
      WHERE b.tenant_id = $1
        AND bs.service_id = $2
        AND b.is_active = true
      ORDER BY b.rating DESC, b.full_name ASC
    `,
    [tenantId, serviceId]
  );

  return result.rows;
}

export async function getBarberForService(tenantId: string, serviceId: string, barberId: string) {
  const result = await query<{
    id: string;
    full_name: string;
    rating: string;
  }>(
    `
      SELECT b.id, b.full_name, b.rating::text AS rating
      FROM barbers b
      INNER JOIN barber_services bs
        ON bs.barber_id = b.id
       AND bs.tenant_id = b.tenant_id
      WHERE b.tenant_id = $1
        AND bs.service_id = $2
        AND b.id = $3
        AND b.is_active = true
      LIMIT 1
    `,
    [tenantId, serviceId, barberId]
  );

  return result.rows[0] ?? null;
}

export async function listWorkingHours(tenantId: string, barberId: string) {
  const result = await query<{
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>(
    `
      SELECT day_of_week, start_time::text, end_time::text
      FROM barber_working_hours
      WHERE tenant_id = $1 AND barber_id = $2 AND is_active = true
      ORDER BY day_of_week ASC
    `,
    [tenantId, barberId]
  );

  return result.rows;
}

export async function listWorkingHoursForBarbers(tenantId: string, barberIds: string[]) {
  if (barberIds.length === 0) {
    return [];
  }

  const result = await query<{
    barber_id: string;
    day_of_week: number;
    start_time: string;
    end_time: string;
  }>(
    `
      SELECT barber_id, day_of_week, start_time::text, end_time::text
      FROM barber_working_hours
      WHERE tenant_id = $1
        AND barber_id = ANY($2::uuid[])
        AND is_active = true
      ORDER BY barber_id ASC, day_of_week ASC
    `,
    [tenantId, barberIds]
  );

  return result.rows;
}
