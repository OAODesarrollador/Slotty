import type { PoolClient } from "pg";

import { query } from "@/lib/db";
import type { AppointmentStatus, PaymentMethod, PaymentStatus } from "@/lib/types";

export async function listFutureAppointmentsForBarber(
  tenantId: string,
  barberId: string,
  rangeStart: Date,
  rangeEnd: Date
) {
  const result = await query<{
    id: string;
    datetime_start: string;
    datetime_end: string;
    status: AppointmentStatus;
  }>(
    `
      SELECT id, datetime_start, datetime_end, status
      FROM appointments
      WHERE tenant_id = $1
        AND barber_id = $2
        AND status IN ('pending_payment', 'pending_verification', 'scheduled', 'confirmed', 'checked_in', 'in_progress')
        AND datetime_end >= $3
        AND datetime_start < $4
      ORDER BY datetime_start ASC
    `,
    [tenantId, barberId, rangeStart.toISOString(), rangeEnd.toISOString()]
  );

  return result.rows;
}

export async function getAppointmentDetail(tenantId: string, appointmentId: string) {
  const result = await query<{
    id: string;
    datetime_start: string;
    datetime_end: string;
    status: AppointmentStatus;
    customer_name: string;
    customer_phone: string;
    barber_name: string;
    service_name: string;
    price: string;
    payment_method: PaymentMethod | null;
    payment_status: PaymentStatus | null;
    total_amount: string | null;
    amount_required_now: string | null;
    amount_paid: string | null;
  }>(
    `
      SELECT
        a.id,
        a.datetime_start,
        a.datetime_end,
        a.status,
        c.full_name AS customer_name,
        c.phone AS customer_phone,
        b.full_name AS barber_name,
        s.name AS service_name,
        s.price::text AS price,
        p.method AS payment_method,
        p.status AS payment_status,
        p.total_amount::text,
        p.amount_required_now::text,
        p.amount_paid::text
      FROM appointments a
      INNER JOIN customers c ON c.id = a.customer_id AND c.tenant_id = a.tenant_id
      INNER JOIN barbers b ON b.id = a.barber_id AND b.tenant_id = a.tenant_id
      INNER JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
      LEFT JOIN payments p ON p.appointment_id = a.id AND p.tenant_id = a.tenant_id
      WHERE a.tenant_id = $1 AND a.id = $2
      LIMIT 1
    `,
    [tenantId, appointmentId]
  );

  return result.rows[0] ?? null;
}

export async function listOwnerAppointments(tenantId: string) {
  const result = await query<{
    id: string;
    datetime_start: string;
    datetime_end: string;
    status: AppointmentStatus;
    customer_name: string;
    barber_name: string;
    service_name: string;
  }>(
    `
      SELECT
        a.id,
        a.datetime_start,
        a.datetime_end,
        a.status,
        c.full_name AS customer_name,
        b.full_name AS barber_name,
        s.name AS service_name
      FROM appointments a
      INNER JOIN customers c ON c.id = a.customer_id AND c.tenant_id = a.tenant_id
      INNER JOIN barbers b ON b.id = a.barber_id AND b.tenant_id = a.tenant_id
      INNER JOIN services s ON s.id = a.service_id AND s.tenant_id = a.tenant_id
      WHERE a.tenant_id = $1
        AND a.datetime_start >= now() - interval '3 hours'
      ORDER BY a.datetime_start ASC
      LIMIT 50
    `,
    [tenantId]
  );

  return result.rows;
}

export async function upsertCustomer(
  client: PoolClient,
  tenantId: string,
  input: { fullName: string; phone: string; email?: string | null; notes?: string | null }
) {
  const result = await client.query<{
    id: string;
    full_name: string;
    phone: string;
  }>(
    `
      INSERT INTO customers (tenant_id, full_name, phone, email, notes)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (tenant_id, phone)
      DO UPDATE
         SET full_name = EXCLUDED.full_name,
             email = COALESCE(EXCLUDED.email, customers.email),
             notes = COALESCE(EXCLUDED.notes, customers.notes),
             updated_at = now()
      RETURNING id, full_name, phone
    `,
    [tenantId, input.fullName, input.phone, input.email ?? null, input.notes ?? null]
  );

  return result.rows[0];
}

export async function insertAppointment(
  client: PoolClient,
  input: {
    tenantId: string;
    customerId: string;
    barberId: string;
    serviceId: string;
    datetimeStart: Date;
    datetimeEnd: Date;
    status: AppointmentStatus;
    source: string;
    customerNotes?: string | null;
  }
) {
  const result = await client.query<{ id: string }>(
    `
      INSERT INTO appointments (
        tenant_id,
        customer_id,
        barber_id,
        service_id,
        datetime_start,
        datetime_end,
        status,
        source,
        customer_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `,
    [
      input.tenantId,
      input.customerId,
      input.barberId,
      input.serviceId,
      input.datetimeStart.toISOString(),
      input.datetimeEnd.toISOString(),
      input.status,
      input.source,
      input.customerNotes ?? null
    ]
  );

  return result.rows[0];
}

export async function insertPayment(
  client: PoolClient,
  input: {
    tenantId: string;
    appointmentId: string;
    method: PaymentMethod;
    status: PaymentStatus;
    totalAmount: number;
    amountRequiredNow: number;
    amountPaid?: number;
    externalReference?: string | null;
    expiresAt?: Date | null;
  }
) {
  await client.query(
    `
      INSERT INTO payments (
        tenant_id,
        appointment_id,
        method,
        status,
        total_amount,
        amount_required_now,
        amount_paid,
        external_reference,
        expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `,
    [
      input.tenantId,
      input.appointmentId,
      input.method,
      input.status,
      input.totalAmount,
      input.amountRequiredNow,
      input.amountPaid ?? 0,
      input.externalReference ?? null,
      input.expiresAt?.toISOString() ?? null
    ]
  );
}
