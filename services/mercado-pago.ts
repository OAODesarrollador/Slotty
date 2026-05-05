import { advisoryTenantLock, withTransaction } from "@/lib/db";
import {
  applyMercadoPagoPaymentApproval,
  applyMercadoPagoPaymentStatus,
  applyMercadoPagoPaymentVerificationRequired,
  getMercadoPagoPaymentSyncContext
} from "@/repositories/appointments";
import { addMinutes } from "@/lib/time";
import { buildTenantUrl } from "@/lib/tenant-domain";

function getAppUrl() {
  const appUrl = process.env.APP_URL;

  if (!appUrl) {
    throw new Error("Falta configurar APP_URL.");
  }

  return appUrl.replace(/\/$/, "");
}

function canUseMercadoPagoAutoReturn(appUrl: string) {
  try {
    const { hostname } = new URL(appUrl);
    return hostname !== "localhost" && hostname !== "127.0.0.1";
  } catch {
    return false;
  }
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function getMercadoPagoNotificationUrl(appUrl: string, tenantSlug: string) {
  return `${appUrl}/api/public/${tenantSlug}/mercado-pago/webhook`;
}

function buildMercadoPagoReturnUrl(
  appUrl: string,
  tenantSlug: string,
  appointmentId: string,
  returnType: "success" | "pending" | "failure"
) {
  const url = new URL(buildTenantUrl(appUrl, tenantSlug, `/mi-turno/${appointmentId}`));
  url.searchParams.set("mp_return", returnType);
  return url.toString();
}

export async function fetchMercadoPagoPayment(input: {
  accessToken: string;
  paymentId: string;
}) {
  if (!input.accessToken) {
    throw new Error("Mercado Pago no esta configurado para este tenant.");
  }

  const response = await fetch(`https://api.mercadopago.com/v1/payments/${input.paymentId}`, {
    headers: {
      Authorization: `Bearer ${input.accessToken}`
    },
    cache: "no-store"
  });

  const body = await response.json().catch(() => null);

  if (!response.ok || !body?.id) {
    const responseSummary =
      body && typeof body === "object" ? JSON.stringify(body) : String(body ?? "empty_response");

    throw new Error(
      `No se pudo verificar el pago en Mercado Pago. paymentId=${input.paymentId} httpStatus=${response.status} response=${responseSummary}`
    );
  }

  return {
    id: String(body.id),
    status: String(body.status ?? ""),
    statusDetail: String(body.status_detail ?? ""),
    externalReference: typeof body.external_reference === "string" ? body.external_reference : "",
    transactionAmount: Number(body.transaction_amount ?? 0)
  };
}

export async function syncMercadoPagoPayment(input: {
  tenantId: string;
  accessToken: string;
  paymentId: string;
  expectedAppointmentId?: string;
}) {
  const remotePayment = await fetchMercadoPagoPayment({
    accessToken: input.accessToken,
    paymentId: input.paymentId
  });

  const appointmentId = remotePayment.externalReference;
  if (!appointmentId) {
    return { synced: false, reason: "missing_external_reference" as const };
  }

  if (input.expectedAppointmentId && appointmentId !== input.expectedAppointmentId) {
    return { synced: false, reason: "appointment_mismatch" as const };
  }

  const context = await getMercadoPagoPaymentSyncContext(input.tenantId, appointmentId);
  if (!context) {
    return { synced: false, reason: "payment_not_found" as const };
  }

  const expectedAmount = roundMoney(Number(context.amount_required_now));
  const paidAmount = roundMoney(remotePayment.transactionAmount);
  const amountMatches = expectedAmount === paidAmount;

  await withTransaction(async (client) => {
    await advisoryTenantLock(client, input.tenantId, appointmentId);

    if (remotePayment.status === "approved") {
      if (amountMatches) {
        await applyMercadoPagoPaymentApproval(client, {
          tenantId: input.tenantId,
          appointmentId,
          amountPaid: paidAmount
        });
        return;
      }

      await applyMercadoPagoPaymentVerificationRequired(client, {
        tenantId: input.tenantId,
        appointmentId,
        amountPaid: paidAmount
      });
      return;
    }

    if (remotePayment.status === "rejected") {
      await applyMercadoPagoPaymentStatus(client, {
        tenantId: input.tenantId,
        appointmentId,
        paymentStatus: "rejected",
        amountPaid: paidAmount
      });
      return;
    }

    if (remotePayment.status === "cancelled") {
      await applyMercadoPagoPaymentStatus(client, {
        tenantId: input.tenantId,
        appointmentId,
        paymentStatus: "cancelled",
        amountPaid: paidAmount
      });
      return;
    }

    if (remotePayment.status === "refunded" || remotePayment.status === "charged_back") {
      await applyMercadoPagoPaymentStatus(client, {
        tenantId: input.tenantId,
        appointmentId,
        paymentStatus: "refunded",
        amountPaid: paidAmount
      });
      return;
    }

    await applyMercadoPagoPaymentStatus(client, {
      tenantId: input.tenantId,
      appointmentId,
      paymentStatus: "pending",
      amountPaid: paidAmount
    });
  });

  return {
    synced: true,
    appointmentId,
    status: remotePayment.status,
    amountMatches,
    expectedAmount,
    paidAmount
  };
}

export async function createMercadoPagoPreference(input: {
  accessToken: string;
  tenantSlug: string;
  tenantName: string;
  appointmentId: string;
  serviceId: string;
  barberId: string;
  scheduledAt: string;
  bookingDate: string;
  payerName: string;
  payerPhone: string;
  title: string;
  amountToCharge: number;
}) {
  if (!input.accessToken) {
    throw new Error("Mercado Pago no esta configurado para este tenant.");
  }

  const appUrl = getAppUrl();
  const shouldEnableAutoReturn = canUseMercadoPagoAutoReturn(appUrl);
  const expirationDateTo = addMinutes(new Date(), 15).toISOString();
  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      external_reference: input.appointmentId,
      statement_descriptor: "SLOTTY",
      expires: true,
      expiration_date_to: expirationDateTo,
      items: [
        {
          id: input.appointmentId,
          title: input.title,
          quantity: 1,
          currency_id: "ARS",
          unit_price: Number(input.amountToCharge.toFixed(2))
        }
      ],
      payer: {
        name: input.payerName,
        phone: {
          number: input.payerPhone
        }
      },
      back_urls: {
        success: buildMercadoPagoReturnUrl(appUrl, input.tenantSlug, input.appointmentId, "success"),
        pending: buildMercadoPagoReturnUrl(appUrl, input.tenantSlug, input.appointmentId, "pending"),
        failure: buildMercadoPagoReturnUrl(appUrl, input.tenantSlug, input.appointmentId, "failure")
      },
      notification_url: getMercadoPagoNotificationUrl(appUrl, input.tenantSlug),
      ...(shouldEnableAutoReturn ? { auto_return: "approved" } : {}),
      metadata: {
        tenantSlug: input.tenantSlug,
        tenantName: input.tenantName,
        appointmentId: input.appointmentId
      }
    })
  });

  const body = await response.json();

  if (!response.ok || !body?.id || !body?.init_point) {
    throw new Error("No se pudo crear la preferencia de Mercado Pago.");
  }

  return {
    preferenceId: String(body.id),
    checkoutUrl: String(body.init_point)
  };
}


