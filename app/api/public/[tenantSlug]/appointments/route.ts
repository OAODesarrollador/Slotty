import { NextRequest, NextResponse } from "next/server";

import { fail, ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { appointmentPayloadSchema } from "@/lib/validators";
import { createAppointment } from "@/services/booking";

function payloadFromFormData(formData: FormData) {
  return {
    barberId: String(formData.get("barberId") ?? ""),
    serviceId: String(formData.get("serviceId") ?? ""),
    datetimeStart: String(formData.get("datetimeStart") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? "pay_at_store"),
    customer: {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? ""),
      notes: String(formData.get("notes") ?? "")
    },
    redirectBase: String(formData.get("redirectBase") ?? "")
  };
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
      return fail("Payload invalido.", 400, parsed.error.flatten());
    }

    const redirectBase = String((rawPayload as { redirectBase?: string }).redirectBase ?? `/${tenantSlug}`);
    return NextResponse.redirect(new URL(`${redirectBase}&error=Payload%20invalido`, request.url));
  }

  try {
    const result = await createAppointment({
      tenantId: tenant.tenantId,
      barberId: parsed.data.barberId,
      serviceId: parsed.data.serviceId,
      datetimeStart: new Date(parsed.data.datetimeStart),
      paymentMethod: parsed.data.paymentMethod,
      customer: {
        fullName: parsed.data.customer.fullName,
        phone: parsed.data.customer.phone,
        email: parsed.data.customer.email || null,
        notes: parsed.data.customer.notes || null
      },
      source: "online"
    });

    if (isJson) {
      return ok(result, { status: 201 });
    }

    return NextResponse.redirect(new URL(`/${tenantSlug}/mi-turno/${result.appointmentId}`, request.url));
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No se pudo crear la reserva.";
    const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";

    if (isJson) {
      return fail(message, code === "23P01" ? 409 : 400);
    }

    const redirectBase = String((rawPayload as { redirectBase?: string }).redirectBase ?? `/${tenantSlug}`);
    return NextResponse.redirect(new URL(`${redirectBase}&error=${encodeURIComponent(message)}`, request.url));
  }
}
