import type { PoolClient } from "pg";

import { advisoryTenantLock, withTransaction } from "@/lib/db";
import type { AppointmentStatus, PaymentMethod, PaymentStatus } from "@/lib/types";
import { hasAppointmentConflict, insertAppointment, insertPayment, upsertCustomer } from "@/repositories/appointments";
import { getBarberForService } from "@/repositories/barbers";
import { getServiceById } from "@/repositories/services";
import { getTenantSettings } from "@/repositories/tenants";
import { assertBookableAppointmentSlot } from "@/services/availability";
import { computePaymentBreakdown } from "@/services/payments";

async function createAppointmentWithClient(
  client: PoolClient,
  input: {
    tenantId: string;
    barberId: string;
    serviceId: string;
    datetimeStart: Date;
    paymentMethod: PaymentMethod;
    customer: { fullName: string; phone: string; email?: string | null; notes?: string | null };
    source: "online" | "walk_in";
  },
  resolved: {
    service: { name: string; price: string; duration_minutes: number };
    tenant: { deposit_type: string; deposit_value: string; timezone: string };
  }
) {
  const { datetimeEnd } = await assertBookableAppointmentSlot({
    tenantId: input.tenantId,
    timezone: resolved.tenant.timezone,
    barberId: input.barberId,
    serviceDurationMinutes: resolved.service.duration_minutes,
    scheduledAt: input.datetimeStart
  });

  const paymentBreakdown = computePaymentBreakdown(Number(resolved.service.price), resolved.tenant);

  const appointmentStatus: AppointmentStatus =
    input.paymentMethod === "pay_at_store"
      ? "scheduled"
      : input.paymentMethod === "bank_transfer"
        ? "pending_verification"
        : paymentBreakdown.amountRequiredNow > 0
          ? "pending_payment"
          : "scheduled";

  const paymentStatus: PaymentStatus =
    input.paymentMethod === "pay_at_store"
      ? "pending"
      : input.paymentMethod === "bank_transfer"
        ? "pending_verification"
        : paymentBreakdown.amountRequiredNow > 0
          ? "pending"
          : "approved";

  await advisoryTenantLock(client, input.tenantId, input.barberId);

  const hasConflict = await hasAppointmentConflict(client, {
    tenantId: input.tenantId,
    barberId: input.barberId,
    datetimeStart: input.datetimeStart,
    datetimeEnd
  });

  if (hasConflict) {
    throw new Error("Este horario ya no está disponible.");
  }

  const customer = await upsertCustomer(client, input.tenantId, input.customer);
  const appointment = await insertAppointment(client, {
    tenantId: input.tenantId,
    customerId: customer.id,
    barberId: input.barberId,
    serviceId: input.serviceId,
    datetimeStart: input.datetimeStart,
    datetimeEnd,
    status: appointmentStatus,
    source: input.source,
    customerNotes: input.customer.notes
  });

  await insertPayment(client, {
    tenantId: input.tenantId,
    appointmentId: appointment.id,
    method: input.paymentMethod,
    status: paymentStatus,
    totalAmount: paymentBreakdown.totalAmount,
    amountRequiredNow: paymentBreakdown.amountRequiredNow,
    amountPaid: 0,
    expiresAt:
      input.paymentMethod === "mercado_pago" && paymentBreakdown.amountRequiredNow > 0
        ? new Date(Date.now() + 15 * 60_000)
        : null
  });

  return {
    appointmentId: appointment.id,
    customerId: customer.id,
    paymentMethod: input.paymentMethod,
    appointmentStatus,
    paymentStatus,
    paymentBreakdown,
    serviceName: resolved.service.name,
    datetimeStart: input.datetimeStart.toISOString(),
    datetimeEnd: datetimeEnd.toISOString()
  };
}

export async function createAppointment(input: {
  tenantId: string;
  barberId: string;
  serviceId: string;
  datetimeStart: Date;
  paymentMethod: PaymentMethod;
  customer: { fullName: string; phone: string; email?: string | null; notes?: string | null };
  source: "online" | "walk_in";
}) {
  const [service, tenant, barber] = await Promise.all([
    getServiceById(input.tenantId, input.serviceId),
    getTenantSettings(input.tenantId),
    getBarberForService(input.tenantId, input.serviceId, input.barberId)
  ]);

  if (!service) {
    throw new Error("Servicio no encontrado para este tenant.");
  }

  if (!tenant) {
    throw new Error("Tenant inválido.");
  }

  if (!barber) {
    throw new Error("El barbero no pertenece al tenant o no puede realizar este servicio.");
  }

  return withTransaction((client) =>
    createAppointmentWithClient(client, input, {
      service,
      tenant: {
        deposit_type: tenant.deposit_type,
        deposit_value: tenant.deposit_value,
        timezone: tenant.timezone
      }
    })
  );
}

export { createAppointmentWithClient };
