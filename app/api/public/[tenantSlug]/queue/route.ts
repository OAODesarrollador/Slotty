import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { fail, ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { tenantPathForHost } from "@/lib/tenant-domain";
import { queuePayloadSchema } from "@/lib/validators";
import { getQueueEntryDetail } from "@/repositories/queue";
import { enqueueQueueEntry } from "@/services/queue";

function redirectTo(path: string, status = 303) {
  return new NextResponse(null, {
    status,
    headers: {
      Location: path
    }
  });
}

function payloadFromFormData(formData: FormData) {
  return {
    serviceId: String(formData.get("serviceId") ?? ""),
    barberId: formData.get("barberId") ? String(formData.get("barberId")) : undefined,
    customer: {
      fullName: String(formData.get("fullName") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      email: String(formData.get("email") ?? "")
    }
  };
}

function revalidateQueuePages(tenantSlug: string, queueEntryId?: string) {
  revalidatePath(`/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/fila`);
  revalidatePath(`/${tenantSlug}/owner/dashboard`);
  if (queueEntryId) {
    revalidatePath(`/${tenantSlug}/fila/${queueEntryId}`);
  }
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

    return redirectTo(`${tenantPathForHost(request.headers.get("host"), tenantSlug, "/fila")}?error=Payload%20invalido`);
  }

  try {
    const queueEntry = await enqueueQueueEntry({
      tenant,
      serviceId: parsed.data.serviceId,
      barberId: parsed.data.barberId ?? null,
      customer: {
        fullName: parsed.data.customer.fullName,
        phone: parsed.data.customer.phone,
        email: parsed.data.customer.email || null
      }
    });
    revalidateQueuePages(tenantSlug, queueEntry.id);

    if (isJson) {
      const detail = await getQueueEntryDetail(tenant.tenantId, queueEntry.id);
      return ok({
        queueEntryId: queueEntry.id,
        position: detail?.position ?? null,
        estimatedTime: detail?.estimated_time ?? null
      }, { status: 201 });
    }

    return redirectTo(tenantPathForHost(request.headers.get("host"), tenantSlug, `/fila/${queueEntry.id}`));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo generar la fila.";
    if (isJson) {
      return fail(message, 400);
    }

    return redirectTo(`${tenantPathForHost(request.headers.get("host"), tenantSlug, "/fila")}?error=${encodeURIComponent(message)}`);
  }
}
