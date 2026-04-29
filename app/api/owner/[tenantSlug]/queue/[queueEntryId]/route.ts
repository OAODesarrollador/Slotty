import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { getSessionForTenant } from "@/lib/auth";
import { fail, ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { queueActionSchema } from "@/lib/validators";
import {
  assignQueueToSlot,
  cancelQueueEntry,
  markQueueEntryDone,
  markQueueEntryInProgress,
  markQueueEntryNoShow,
  recalculateQueue
} from "@/services/queue";

function revalidateQueuePages(tenantSlug: string, queueEntryId: string) {
  revalidatePath(`/${tenantSlug}/owner/dashboard`);
  revalidatePath(`/${tenantSlug}/fila/${queueEntryId}`);
  revalidatePath(`/${tenantSlug}/fila`);
  revalidatePath(`/${tenantSlug}`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; queueEntryId: string }> }
) {
  const { tenantSlug, queueEntryId } = await params;
  const session = await getSessionForTenant(tenantSlug);
  if (!session) {
    return fail("No autorizado.", 401);
  }

  const tenant = await requireTenantBySlug(tenantSlug);
  const contentType = request.headers.get("content-type") ?? "";
  const isJson = contentType.includes("application/json");
  const rawPayload = isJson
    ? await request.json()
    : { action: String((await request.formData()).get("action") ?? "") };
  const parsed = queueActionSchema.safeParse(rawPayload);

  if (!parsed.success) {
    return fail("Accion invalida.", 400, parsed.error.flatten());
  }

  try {
    switch (parsed.data.action) {
      case "assign":
        await assignQueueToSlot({ tenant, queueEntryId });
        await recalculateQueue(tenant);
        break;
      case "start":
        await markQueueEntryInProgress(tenant, queueEntryId);
        break;
      case "done":
        await markQueueEntryDone(tenant, queueEntryId);
        break;
      case "no_show":
        await markQueueEntryNoShow(tenant, queueEntryId);
        break;
      case "cancel":
        await cancelQueueEntry(tenant, queueEntryId);
        break;
    }

    revalidateQueuePages(tenantSlug, queueEntryId);

    if (isJson) {
      return ok({ ok: true });
    }

    return NextResponse.redirect(new URL(`/${tenantSlug}/owner/dashboard`, request.url));
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la fila.";
    if (isJson) {
      return fail(message, 400);
    }

    return NextResponse.redirect(new URL(`/${tenantSlug}/owner/dashboard?error=${encodeURIComponent(message)}`, request.url));
  }
}
