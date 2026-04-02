import type { PoolClient } from "pg";

import { withTransaction, advisoryTenantLock } from "@/lib/db";
import type { AppointmentStatus, PaymentMethod, PaymentStatus } from "@/lib/types";
import { getServiceById } from "@/repositories/services";
import { getTenantSettings } from "@/repositories/tenants";
import { insertAppointment, insertPayment, upsertCustomer } from "@/repositories/appointments";
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
    tenant: { deposit_type: string; deposit_value: string };
  }
) {
  const paymentBreakdown = computePaymentBreakdown(Number(resolved.service.price), resolved.tenant);
  const datetimeEnd = new Date(input.datetimeStart.getTime() + resolved.service.duration_minutes * 60_000);

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
  const [service, tenant] = await Promise.all([
    getServiceById(input.tenantId, input.serviceId),
    getTenantSettings(input.tenantId)
  ]);

  if (!service || !tenant) {
    throw new Error("Datos de reserva invalidos.");
  }

  return withTransaction((client) =>
    createAppointmentWithClient(client, input, {
      service,
      tenant
    })
  );
}

export { createAppointmentWithClient };
