import { NextRequest } from "next/server";

import { ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { getTenantBookingSettings } from "@/repositories/tenants";
import { syncMercadoPagoPayment } from "@/services/mercado-pago";

function readPaymentIdFromSearchParams(request: NextRequest) {
  return request.nextUrl.searchParams.get("data.id")
    ?? request.nextUrl.searchParams.get("id")
    ?? request.nextUrl.searchParams.get("payment_id")
    ?? "";
}

function readPaymentIdFromBody(body: unknown) {
  if (!body || typeof body !== "object") {
    return "";
  }

  const typedBody = body as {
    data?: { id?: unknown };
    id?: unknown;
    type?: unknown;
    topic?: unknown;
  };

  if (typedBody.data && typeof typedBody.data.id === "string") {
    return typedBody.data.id;
  }

  if (typedBody.data && typeof typedBody.data.id === "number") {
    return String(typedBody.data.id);
  }

  if (typeof typedBody.id === "string") {
    return typedBody.id;
  }

  if (typeof typedBody.id === "number") {
    return String(typedBody.id);
  }

  return "";
}

async function handleNotification(
  request: NextRequest,
  tenantSlug: string,
  rawBody?: unknown
) {
  const tenant = await requireTenantBySlug(tenantSlug);
  const tenantSettings = await getTenantBookingSettings(tenant.tenantId);
  const paymentId = readPaymentIdFromBody(rawBody) || readPaymentIdFromSearchParams(request);

  if (!paymentId || !tenantSettings?.mercado_pago_access_token) {
    return ok({ received: true, processed: false });
  }

  const result = await syncMercadoPagoPayment({
    tenantId: tenant.tenantId,
    accessToken: tenantSettings.mercado_pago_access_token,
    paymentId
  }).catch((error: unknown) => {
    console.error(`ERROR PROCESSING MERCADO PAGO WEBHOOK FOR TENANT ${tenantSlug}`);
    console.error(error);
    return { synced: false, reason: "sync_error" as const };
  });

  return ok({ received: true, processed: true, result });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  return handleNotification(request, tenantSlug);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const body = await request.json().catch(() => null);
  return handleNotification(request, tenantSlug, body);
}
