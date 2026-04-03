import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { fail, ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { appointmentPayloadSchema } from "@/lib/validators";
import { createAppointment } from "@/services/booking";

function payloadFromFormData(formData: FormData) {
  return {
    barberId: String(formData.get("barberId") ?? ""),
    serviceId: String(formData.get("serviceId") ?? ""),
    scheduledAt: String(formData.get("scheduledAt") ?? formData.get("datetimeStart") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? "pay_at_store"),
    payInFull: String(formData.get("payInFull") ?? "false") === "true",
    customer: {
      name: String(formData.get("name") ?? formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? "")
    },
    notes: String(formData.get("notes") ?? "")
  };
}

function resolveRedirectBase(tenantSlug: string, payload: unknown) {
  const fallback = `/${tenantSlug}/reservar`;
  if (!payload || typeof payload !== "object" || !("redirectBase" in payload)) {
    return fallback;
  }

  const redirectBase = (payload as { redirectBase?: unknown }).redirectBase;
  return typeof redirectBase === "string" && redirectBase.length > 0 ? redirectBase : fallback;
}

function revalidateBookingPages(tenantSlug: string) {
  revalidatePath(`/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/reservar`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");

  const rawPayload = isJson ? await request.json() : payloadFromFormData(await request.formData());
  const parsed = appointmentPayloadSchema.safeParse(rawPayload);

  if (!parsed.success) {
    if (isJson) {
      return fail("Payload inválido.", 400, parsed.error.flatten());
    }

    const redirectBase = resolveRedirectBase(tenantSlug, rawPayload);
    return NextResponse.redirect(new URL(`${redirectBase}&error=Payload%20invalido`, request.url));
  }

  try {
    const result = await createAppointment({
      tenantId: tenant.tenantId,
      barberId: parsed.data.barberId,
      serviceId: parsed.data.serviceId,
      datetimeStart: new Date(parsed.data.scheduledAt),
      paymentMethod: parsed.data.paymentMethod,
      payInFull: parsed.data.payInFull,
      customer: {
        fullName: parsed.data.customer.name,
        phone: parsed.data.customer.phone,
        notes: parsed.data.notes || null
      },
      source: "online"
    });

    revalidateBookingPages(tenantSlug);

    if (isJson) {
      return ok(result, { status: 201 });
    }

    if (result.checkoutUrl) {
      return NextResponse.redirect(result.checkoutUrl);
    }

    return NextResponse.redirect(new URL(`/${tenantSlug}/mi-turno/${result.appointmentId}`, request.url));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No se pudo crear la reserva.";
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
    const status = code === "23P01" || message === "Este horario ya no está disponible." ? 409 : 400;

    if (isJson) {
      return fail(message, status);
    }

    const redirectBase = resolveRedirectBase(tenantSlug, rawPayload);
    return NextResponse.redirect(new URL(`${redirectBase}&error=${encodeURIComponent(message)}`, request.url));
  }
}
