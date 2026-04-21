import type { PoolClient } from "pg";

import { query } from "@/lib/db";
import type { AppointmentStatus, PaymentMethod, PaymentStatus } from "@/lib/types";

type MercadoPagoSyncContext = {
  appointment_id: string;
  appointment_status: AppointmentStatus;
  payment_status: PaymentStatus;
  amount_required_now: string;
  amount_paid: string;
};

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

export async function listAppointmentsForBarbersInRange(
  tenantId: string,
  barberIds: string[],
  rangeStart: Date,
  rangeEnd: Date
) {
  if (barberIds.length === 0) {
    return [];
  }

  const result = await query<{
    id: string;
    barber_id: string;
    datetime_start: string;
    datetime_end: string;
    status: AppointmentStatus;
  }>(
    `
      SELECT id, barber_id, datetime_start, datetime_end, status
      FROM appointments
      WHERE tenant_id = $1
        AND barber_id = ANY($2::uuid[])
        AND status IN ('pending_payment', 'pending_verification', 'scheduled', 'confirmed', 'checked_in', 'in_progress')
        AND datetime_end > $3
        AND datetime_start < $4
      ORDER BY barber_id ASC, datetime_start ASC
    `,
    [tenantId, barberIds, rangeStart.toISOString(), rangeEnd.toISOString()]
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

export async function hasAppointmentConflict(
  client: PoolClient,
  input: {
    tenantId: string;
    barberId: string;
    datetimeStart: Date;
    datetimeEnd: Date;
  }
) {
  const result = await client.query<{ id: string }>(
    `
      SELECT id
      FROM appointments
      WHERE tenant_id = $1
        AND barber_id = $2
        AND status IN ('pending_payment', 'pending_verification', 'scheduled', 'confirmed', 'checked_in', 'in_progress')
        AND datetime_end > $3
        AND datetime_start < $4
      LIMIT 1
    `,
    [
      input.tenantId,
      input.barberId,
      input.datetimeStart.toISOString(),
      input.datetimeEnd.toISOString()
    ]
  );

  return (result.rowCount ?? 0) > 0;
}

export async function insertAppointment(
  client: PoolClient,
  input: {
    id: string;
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
        id,
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
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id
    `,
    [
      input.id,
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

export async function getMercadoPagoPaymentSyncContext(tenantId: string, appointmentId: string) {
  const result = await query<MercadoPagoSyncContext>(
    `
      SELECT
        p.appointment_id,
        a.status AS appointment_status,
        p.status AS payment_status,
        p.amount_required_now::text,
        p.amount_paid::text
      FROM payments p
      INNER JOIN appointments a ON a.id = p.appointment_id AND a.tenant_id = p.tenant_id
      WHERE p.tenant_id = $1
        AND p.appointment_id = $2
        AND p.method = 'mercado_pago'
      LIMIT 1
    `,
    [tenantId, appointmentId]
  );

  return result.rows[0] ?? null;
}

export async function applyMercadoPagoPaymentApproval(
  client: PoolClient,
  input: {
    tenantId: string;
    appointmentId: string;
    amountPaid: number;
  }
) {
  await client.query(
    `
      UPDATE payments
      SET status = 'approved',
          amount_paid = $3,
          updated_at = now()
      WHERE tenant_id = $1
        AND appointment_id = $2
        AND method = 'mercado_pago'
    `,
    [input.tenantId, input.appointmentId, input.amountPaid]
  );

  await client.query(
    `
      UPDATE appointments
      SET status = 'confirmed',
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
        AND status IN ('pending_payment', 'pending_verification', 'scheduled', 'confirmed')
    `,
    [input.tenantId, input.appointmentId]
  );
}

export async function applyMercadoPagoPaymentVerificationRequired(
  client: PoolClient,
  input: {
    tenantId: string;
    appointmentId: string;
    amountPaid: number;
  }
) {
  await client.query(
    `
      UPDATE payments
      SET status = 'pending_verification',
          amount_paid = $3,
          updated_at = now()
      WHERE tenant_id = $1
        AND appointment_id = $2
        AND method = 'mercado_pago'
    `,
    [input.tenantId, input.appointmentId, input.amountPaid]
  );

  await client.query(
    `
      UPDATE appointments
      SET status = 'pending_verification',
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
        AND status IN ('pending_payment', 'pending_verification')
    `,
    [input.tenantId, input.appointmentId]
  );
}

export async function applyMercadoPagoPaymentStatus(
  client: PoolClient,
  input: {
    tenantId: string;
    appointmentId: string;
    paymentStatus: Extract<PaymentStatus, "pending" | "rejected" | "cancelled" | "refunded">;
    amountPaid: number;
  }
) {
  await client.query(
    `
      UPDATE payments
      SET status = $3,
          amount_paid = $4,
          updated_at = now()
      WHERE tenant_id = $1
        AND appointment_id = $2
        AND method = 'mercado_pago'
    `,
    [input.tenantId, input.appointmentId, input.paymentStatus, input.amountPaid]
  );

  if (input.paymentStatus === "rejected" || input.paymentStatus === "cancelled") {
    await client.query(
      `
        UPDATE appointments
        SET status = 'expired',
            updated_at = now()
        WHERE tenant_id = $1
          AND id = $2
          AND status = 'pending_payment'
      `,
      [input.tenantId, input.appointmentId]
    );
  }
}

export async function expirePendingMercadoPagoAppointment(tenantId: string, appointmentId: string) {
  const result = await query<{ appointment_id: string }>(
    `
      WITH payment_update AS (
        UPDATE payments
        SET status = 'expired',
            updated_at = now()
        WHERE tenant_id = $1
          AND appointment_id = $2
          AND method = 'mercado_pago'
          AND status = 'pending'
        RETURNING appointment_id
      )
      UPDATE appointments
      SET status = 'expired',
          updated_at = now()
      WHERE tenant_id = $1
        AND id = $2
        AND status = 'pending_payment'
        AND id IN (SELECT appointment_id FROM payment_update)
      RETURNING id AS appointment_id
    `,
    [tenantId, appointmentId]
  );

  return (result.rowCount ?? 0) > 0;
}
