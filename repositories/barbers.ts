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

export async function listAdminBarbers(tenantId: string) {
  const result = await query<{
    id: string;
    user_id: string | null;
    full_name: string;
    rating: string;
    bio: string | null;
    photo_url: string | null;
    is_active: boolean;
  }>(
    `
      SELECT id, user_id, full_name, rating::text AS rating, bio, photo_url, is_active
      FROM barbers
      WHERE tenant_id = $1
      ORDER BY is_active DESC, full_name ASC
    `,
    [tenantId]
  );

  return result.rows;
}

export async function listBarberServiceLinks(tenantId: string) {
  const result = await query<{
    barber_id: string;
    service_id: string;
  }>(
    `
      SELECT barber_id, service_id
      FROM barber_services
      WHERE tenant_id = $1
      ORDER BY barber_id ASC, service_id ASC
    `,
    [tenantId]
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

export async function createBarber(input: {
  tenantId: string;
  fullName: string;
  bio?: string | null;
  rating?: number;
  photoUrl?: string | null;
  userId?: string | null;
}) {
  const result = await query<{ id: string }>(
    `
      INSERT INTO barbers (
        tenant_id,
        user_id,
        full_name,
        rating,
        bio,
        photo_url,
        is_active,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, true, now(), now())
      RETURNING id
    `,
    [
      input.tenantId,
      input.userId ?? null,
      input.fullName,
      input.rating ?? 4.8,
      input.bio ?? null,
      input.photoUrl ?? null
    ]
  );

  return result.rows[0];
}

export async function updateBarber(input: {
  tenantId: string;
  barberId: string;
  fullName: string;
  bio?: string | null;
  rating?: number;
  photoUrl?: string | null;
  userId?: string | null;
  isActive: boolean;
}) {
  await query(
    `
      UPDATE barbers
      SET user_id = $3,
          full_name = $4,
          rating = $5,
          bio = $6,
          photo_url = $7,
          is_active = $8,
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
    `,
    [
      input.tenantId,
      input.barberId,
      input.userId ?? null,
      input.fullName,
      input.rating ?? 4.8,
      input.bio ?? null,
      input.photoUrl ?? null,
      input.isActive
    ]
  );
}

export async function archiveBarber(tenantId: string, barberId: string) {
  await query(
    `
      UPDATE barbers
      SET is_active = false,
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
    `,
    [tenantId, barberId]
  );
}

export async function replaceBarberServices(input: {
  tenantId: string;
  barberId: string;
  serviceIds: string[];
}) {
  await query(
    `
      DELETE FROM barber_services
      WHERE tenant_id = $1
        AND barber_id = $2
    `,
    [input.tenantId, input.barberId]
  );

  for (const serviceId of input.serviceIds) {
    await query(
      `
        INSERT INTO barber_services (tenant_id, barber_id, service_id, created_at)
        VALUES ($1, $2, $3, now())
      `,
      [input.tenantId, input.barberId, serviceId]
    );
  }
}

export async function replaceBarberWorkingHours(input: {
  tenantId: string;
  barberId: string;
  workingHours: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }>;
}) {
  await query(
    `
      DELETE FROM barber_working_hours
      WHERE tenant_id = $1
        AND barber_id = $2
    `,
    [input.tenantId, input.barberId]
  );

  for (const item of input.workingHours) {
    await query(
      `
        INSERT INTO barber_working_hours (
          tenant_id,
          barber_id,
          day_of_week,
          start_time,
          end_time,
          is_active,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, true, now(), now())
      `,
      [input.tenantId, input.barberId, item.dayOfWeek, item.startTime, item.endTime]
    );
  }
}
