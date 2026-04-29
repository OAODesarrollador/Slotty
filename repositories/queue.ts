import type { PoolClient } from "pg";

import { query } from "@/lib/db";
import type { QueueStatus } from "@/lib/types";

export type QueueListEntry = {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  service_id: string;
  service_name: string;
  service_duration_minutes: number;
  barber_id: string | null;
  barber_name: string | null;
  assigned_appointment_id: string | null;
  status: QueueStatus;
  position: number | null;
  estimated_time: string | null;
  joined_at: string;
};

export async function listQueueEntries(tenantId: string) {
  const result = await query<QueueListEntry>(
    `
      SELECT
        q.id,
        q.customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        COALESCE(q.service_id, q.requested_service_id) AS service_id,
        s.name AS service_name,
        s.duration_minutes AS service_duration_minutes,
        COALESCE(q.barber_id, q.assigned_barber_id) AS barber_id,
        b.full_name AS barber_name,
        q.assigned_appointment_id,
        q.status,
        q.position,
        COALESCE(q.estimated_time, q.estimated_start) AS estimated_time,
        q.joined_at
      FROM queue_entries q
      INNER JOIN customers c ON c.id = q.customer_id AND c.tenant_id = q.tenant_id
      INNER JOIN services s ON s.id = COALESCE(q.service_id, q.requested_service_id) AND s.tenant_id = q.tenant_id
      LEFT JOIN barbers b ON b.id = COALESCE(q.barber_id, q.assigned_barber_id) AND b.tenant_id = q.tenant_id
      WHERE q.tenant_id = $1
        AND q.status IN ('waiting', 'called', 'in_progress')
      ORDER BY
        CASE q.status
          WHEN 'waiting' THEN 1
          WHEN 'called' THEN 2
          WHEN 'in_progress' THEN 3
          ELSE 4
        END,
        COALESCE(q.position, 999999) ASC,
        q.joined_at ASC
    `,
    [tenantId]
  );

  return result.rows;
}

export async function getQueueEntryDetail(tenantId: string, queueEntryId: string) {
  const result = await query<QueueListEntry>(
    `
      SELECT
        q.id,
        q.customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        COALESCE(q.service_id, q.requested_service_id) AS service_id,
        s.name AS service_name,
        s.duration_minutes AS service_duration_minutes,
        COALESCE(q.barber_id, q.assigned_barber_id) AS barber_id,
        b.full_name AS barber_name,
        q.assigned_appointment_id,
        q.status,
        q.position,
        COALESCE(q.estimated_time, q.estimated_start) AS estimated_time,
        q.joined_at
      FROM queue_entries q
      INNER JOIN customers c ON c.id = q.customer_id AND c.tenant_id = q.tenant_id
      INNER JOIN services s ON s.id = COALESCE(q.service_id, q.requested_service_id) AND s.tenant_id = q.tenant_id
      LEFT JOIN barbers b ON b.id = COALESCE(q.barber_id, q.assigned_barber_id) AND b.tenant_id = q.tenant_id
      WHERE q.tenant_id = $1
        AND q.id = $2
      LIMIT 1
    `,
    [tenantId, queueEntryId]
  );

  return result.rows[0] ?? null;
}

export async function insertQueueEntry(
  client: PoolClient,
  input: {
    tenantId: string;
    customerId: string;
    serviceId: string;
    barberId?: string | null;
    notes?: string | null;
  }
) {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO queue_entries (
        tenant_id,
        customer_id,
        requested_service_id,
        service_id,
        assigned_barber_id,
        barber_id,
        status,
        joined_at,
        notes
      )
      VALUES ($1, $2, $3, $3, $4, $4, 'waiting', now(), $5)
      RETURNING id
    `,
    [
      input.tenantId,
      input.customerId,
      input.serviceId,
      input.barberId ?? null,
      input.notes ?? null
    ]
  );

  return result.rows[0];
}

export async function listWaitingQueueEntries(client: PoolClient, tenantId: string) {
  const result = await client.query<QueueListEntry>(
    `
      SELECT
        q.id,
        q.customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        COALESCE(q.service_id, q.requested_service_id) AS service_id,
        s.name AS service_name,
        s.duration_minutes AS service_duration_minutes,
        COALESCE(q.barber_id, q.assigned_barber_id) AS barber_id,
        b.full_name AS barber_name,
        q.assigned_appointment_id,
        q.status,
        q.position,
        COALESCE(q.estimated_time, q.estimated_start) AS estimated_time,
        q.joined_at
      FROM queue_entries q
      INNER JOIN customers c ON c.id = q.customer_id AND c.tenant_id = q.tenant_id
      INNER JOIN services s ON s.id = COALESCE(q.service_id, q.requested_service_id) AND s.tenant_id = q.tenant_id
      LEFT JOIN barbers b ON b.id = COALESCE(q.barber_id, q.assigned_barber_id) AND b.tenant_id = q.tenant_id
      WHERE q.tenant_id = $1
        AND q.status = 'waiting'
      ORDER BY
        CASE WHEN q.barber_id IS NOT NULL THEN 0 ELSE 1 END ASC,
        q.joined_at ASC
    `,
    [tenantId]
  );

  return result.rows;
}

export async function getQueueEntryByIdForUpdate(
  client: PoolClient,
  tenantId: string,
  queueEntryId: string
) {
  const result = await client.query<QueueListEntry>(
    `
      SELECT
        q.id,
        q.customer_id,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        COALESCE(q.service_id, q.requested_service_id) AS service_id,
        s.name AS service_name,
        s.duration_minutes AS service_duration_minutes,
        COALESCE(q.barber_id, q.assigned_barber_id) AS barber_id,
        (
          SELECT b.full_name
          FROM barbers b
          WHERE b.id = COALESCE(q.barber_id, q.assigned_barber_id)
            AND b.tenant_id = q.tenant_id
          LIMIT 1
        ) AS barber_name,
        q.assigned_appointment_id,
        q.status,
        q.position,
        COALESCE(q.estimated_time, q.estimated_start) AS estimated_time,
        q.joined_at
      FROM queue_entries q
      INNER JOIN customers c ON c.id = q.customer_id AND c.tenant_id = q.tenant_id
      INNER JOIN services s ON s.id = COALESCE(q.service_id, q.requested_service_id) AND s.tenant_id = q.tenant_id
      WHERE q.tenant_id = $1
        AND q.id = $2
      FOR UPDATE OF q
    `,
    [tenantId, queueEntryId]
  );

  return result.rows[0] ?? null;
}

export async function updateQueueEntryPositionAndEta(
  client: PoolClient,
  input: {
    tenantId: string;
    queueEntryId: string;
    position: number;
    estimatedTime: Date | null;
  }
) {
  await client.query(
    `
      UPDATE queue_entries
      SET position = $3,
          estimated_time = $4,
          last_recalculated_at = now(),
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
    `,
    [
      input.tenantId,
      input.queueEntryId,
      input.position,
      input.estimatedTime?.toISOString() ?? null
    ]
  );
}

export async function clearQueueEntryPositioning(client: PoolClient, tenantId: string) {
  await client.query(
    `
      UPDATE queue_entries
      SET position = NULL,
          estimated_time = NULL,
          last_recalculated_at = now(),
          updated_at = now()
      WHERE tenant_id = $1
        AND status <> 'waiting'
    `,
    [tenantId]
  );
}

export async function assignQueueEntryToAppointment(
  client: PoolClient,
  input: {
    tenantId: string;
    queueEntryId: string;
    appointmentId: string;
    barberId: string;
    estimatedTime: Date;
  }
) {
  await client.query(
    `
      UPDATE queue_entries
      SET assigned_appointment_id = $3,
          assigned_barber_id = $4,
          barber_id = $4,
          estimated_start = $5,
          estimated_time = $5,
          status = 'called',
          called_at = now(),
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
    `,
    [
      input.tenantId,
      input.queueEntryId,
      input.appointmentId,
      input.barberId,
      input.estimatedTime.toISOString()
    ]
  );
}

export async function updateQueueEntryStatus(
  client: PoolClient,
  input: {
    tenantId: string;
    queueEntryId: string;
    status: QueueStatus;
  }
) {
  await client.query(
    `
      UPDATE queue_entries
      SET status = $3::queue_status,
          called_at = CASE WHEN $3::queue_status = 'called' THEN now() ELSE called_at END,
          started_at = CASE WHEN $3::queue_status = 'in_progress' THEN now() ELSE started_at END,
          finished_at = CASE WHEN $3::queue_status = 'done' THEN now() ELSE finished_at END,
          no_show_at = CASE WHEN $3::queue_status = 'no_show' THEN now() ELSE no_show_at END,
          cancelled_at = CASE WHEN $3::queue_status = 'cancelled' THEN now() ELSE cancelled_at END,
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
    `,
    [input.tenantId, input.queueEntryId, input.status]
  );
}

export async function cancelExpiredWaitingEntries(
  client: PoolClient,
  tenantId: string,
  expirationMinutes: number
) {
  const result = await client.query<{ id: string }>(
    `
      UPDATE queue_entries
      SET status = 'cancelled',
          cancelled_at = now(),
          updated_at = now()
      WHERE tenant_id = $1
        AND status = 'waiting'
        AND joined_at < now() - ($2::text || ' minutes')::interval
      RETURNING id
    `,
    [tenantId, expirationMinutes]
  );

  return result.rows;
}
