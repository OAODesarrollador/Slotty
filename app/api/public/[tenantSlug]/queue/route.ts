import { NextRequest, NextResponse } from "next/server";

import { fail, ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { queuePayloadSchema } from "@/lib/validators";
import { createWalkInQueueEntry } from "@/services/queue";

function payloadFromFormData(formData: FormData) {
  return {
    serviceId: String(formData.get("serviceId") ?? ""),
    customer: {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? "")
    }
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
  const parsed = queuePayloadSchema.safeParse(rawPayload);

  if (!parsed.success) {
    if (isJson) {
      return fail("Payload invalido.", 400, parsed.error.flatten());
    }

    return NextResponse.redirect(new URL(`/${tenantSlug}/fila?error=Payload%20invalido`, request.url));
  }

  try {
    const result = await createWalkInQueueEntry({
      tenant,
      serviceId: parsed.data.serviceId,
      customer: {
        fullName: parsed.data.customer.fullName,
        phone: parsed.data.customer.phone,
        email: parsed.data.customer.email || null
      }
    });

    if (isJson) {
      return ok(result, { status: 201 });
    }

    return NextResponse.redirect(new URL(`/${tenantSlug}/mi-turno/${result.appointmentId}`, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar la fila.";
    if (isJson) {
      return fail(message, 400);
    }

    return NextResponse.redirect(new URL(`/${tenantSlug}/fila?error=${encodeURIComponent(message)}`, request.url));
  }
}
