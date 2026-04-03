import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";

import { advisoryTenantLock, withTransaction } from "@/lib/db";
import type { AppointmentStatus, PaymentMethod, PaymentStatus } from "@/lib/types";
import { hasAppointmentConflict, insertAppointment, insertPayment, upsertCustomer } from "@/repositories/appointments";
import { getBarberForService } from "@/repositories/barbers";
import { getServiceById } from "@/repositories/services";
import { getTenantBookingSettings } from "@/repositories/tenants";
import { dateKeyInTimeZone } from "@/lib/time";
import { assertBookableAppointmentSlot } from "@/services/availability";
import { createMercadoPagoPreference } from "@/services/mercado-pago";
import { computePaymentBreakdown } from "@/services/payments";

async function createAppointmentWithClient(
  client: PoolClient,
  input: {
    appointmentId?: string;
    tenantId: string;
    barberId: string;
    serviceId: string;
    datetimeStart: Date;
    paymentMethod: PaymentMethod;
    paymentExternalReference?: string | null;
    payInFull?: boolean;
    customer: { fullName: string; phone: string; email?: string | null; notes?: string | null };
    source: "online" | "walk_in";
  },
  resolved: {
    service: { name: string; price: string; duration_minutes: number };
    tenant: {
      name: string;
      slug: string;
      deposit_type: string;
      deposit_value: string;
      timezone: string;
    };
  }
) {
  const appointmentId = input.appointmentId ?? randomUUID();

  const { datetimeEnd } = await assertBookableAppointmentSlot({
    tenantId: input.tenantId,
    timezone: resolved.tenant.timezone,
    barberId: input.barberId,
    serviceDurationMinutes: resolved.service.duration_minutes,
    scheduledAt: input.datetimeStart
  });

  const paymentBreakdown = computePaymentBreakdown(
    Number(resolved.service.price),
    resolved.tenant,
    {
      paymentMethod: input.paymentMethod,
      payInFull: input.payInFull
    }
  );

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
    id: appointmentId,
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
    externalReference: input.paymentExternalReference ?? null,
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
  payInFull?: boolean;
  customer: { fullName: string; phone: string; email?: string | null; notes?: string | null };
  source: "online" | "walk_in";
}) {
  const [service, tenant, barber] = await Promise.all([
    getServiceById(input.tenantId, input.serviceId),
    getTenantBookingSettings(input.tenantId),
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

  if (input.paymentMethod === "pay_at_store") {
    if (!tenant.allow_pay_at_store) {
      throw new Error("El pago en el local no está habilitado para este tenant.");
    }
    if (input.payInFull) {
      throw new Error("Efectivo no permite pago adelantado desde la reserva.");
    }
    const todayInTenant = dateKeyInTimeZone(new Date(), tenant.timezone);
    const appointmentDateInTenant = dateKeyInTimeZone(input.datetimeStart, tenant.timezone);
    if (appointmentDateInTenant !== todayInTenant) {
      throw new Error("Las reservas en efectivo solo están disponibles para hoy.");
    }
  }

  if (input.paymentMethod === "bank_transfer" && !tenant.allow_bank_transfer) {
    throw new Error("La transferencia no está habilitada para este tenant.");
  }

  if (input.paymentMethod === "mercado_pago") {
    if (!tenant.allow_mercado_pago) {
      throw new Error("Mercado Pago no está habilitado para este tenant.");
    }

    if (!tenant.mercado_pago_access_token) {
      throw new Error("Mercado Pago no está configurado para este tenant.");
    }
  }

  const appointmentId = randomUUID();
  const previewBreakdown = computePaymentBreakdown(Number(service.price), tenant, {
    paymentMethod: input.paymentMethod,
    payInFull: input.payInFull
  });

  let mercadoPagoCheckoutUrl: string | null = null;
  let paymentExternalReference: string | null = null;

  if (input.paymentMethod === "mercado_pago") {
    const preference = await createMercadoPagoPreference({
      accessToken: tenant.mercado_pago_access_token ?? "",
      tenantSlug: tenant.slug,
      tenantName: tenant.name,
      appointmentId,
      payerName: input.customer.fullName,
      payerPhone: input.customer.phone,
      title: `${service.name} - ${tenant.name}`,
      amountToCharge: previewBreakdown.amountRequiredNow
    });

    mercadoPagoCheckoutUrl = preference.checkoutUrl;
    paymentExternalReference = preference.preferenceId;
  }

  const result = await withTransaction((client) =>
    createAppointmentWithClient(client, {
      appointmentId,
      ...input,
      paymentExternalReference
    }, {
      service,
      tenant: {
        name: tenant.name,
        slug: tenant.slug,
        deposit_type: tenant.deposit_type,
        deposit_value: tenant.deposit_value,
        timezone: tenant.timezone
      }
    })
  );

  return {
    ...result,
    checkoutUrl: mercadoPagoCheckoutUrl
  };
}

export { createAppointmentWithClient };

