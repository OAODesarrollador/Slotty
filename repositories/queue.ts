import type { PoolClient } from "pg";

import { query } from "@/lib/db";
import type { QueueStatus } from "@/lib/types";

export async function listQueueEntries(tenantId: string) {
  const result = await query<{
    id: string;
    status: QueueStatus;
    estimated_start: string | null;
    customer_name: string;
    service_name: string;
    barber_name: string | null;
  }>(
    `
      SELECT
        q.id,
        q.status,
        q.estimated_start,
        c.full_name AS customer_name,
        s.name AS service_name,
        b.full_name AS barber_name
      FROM queue_entries q
      INNER JOIN customers c ON c.id = q.customer_id AND c.tenant_id = q.tenant_id
      INNER JOIN services s ON s.id = q.requested_service_id AND s.tenant_id = q.tenant_id
      LEFT JOIN barbers b ON b.id = q.assigned_barber_id AND b.tenant_id = q.tenant_id
      WHERE q.tenant_id = $1
      ORDER BY q.created_at ASC
    `,
    [tenantId]
  );

  return result.rows;
}

export async function insertQueueEntry(
  client: PoolClient,
  input: {
    tenantId: string;
    customerId: string;
    serviceId: string;
    estimatedStart: Date;
    assignedBarberId: string;
    assignedAppointmentId: string;
  }
) {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO queue_entries (
        tenant_id,
        customer_id,
        requested_service_id,
        assigned_barber_id,
        assigned_appointment_id,
        status,
        estimated_start
      )
      VALUES ($1, $2, $3, $4, $5, 'assigned', $6)
      RETURNING id
    `,
    [
      input.tenantId,
      input.customerId,
      input.serviceId,
      input.assignedBarberId,
      input.assignedAppointmentId,
      input.estimatedStart.toISOString()
    ]
  );

  return result.rows[0];
}
