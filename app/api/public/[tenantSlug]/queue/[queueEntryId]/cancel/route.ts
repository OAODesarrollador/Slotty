import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { fail, ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { cancelQueueEntry } from "@/services/queue";

function revalidateQueuePages(tenantSlug: string, queueEntryId: string) {
  revalidatePath(`/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/fila`);
  revalidatePath(`/${tenantSlug}/fila/${queueEntryId}`);
  revalidatePath(`/${tenantSlug}/owner/dashboard`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string; queueEntryId: string }> }
) {
  const { tenantSlug, queueEntryId } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const isJson = (request.headers.get("content-type") ?? "").includes("application/json");

  try {
    await cancelQueueEntry(tenant, queueEntryId);
    revalidateQueuePages(tenantSlug, queueEntryId);

    if (isJson) {
      return ok({ cancelled: true });
    }

    return NextResponse.redirect(new URL(`/${tenantSlug}/fila?cancelled=1`, request.url), 303);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo cancelar la fila.";
    if (isJson) {
      return fail(message, 400);
    }

    return NextResponse.redirect(new URL(`/${tenantSlug}/fila/${queueEntryId}?error=${encodeURIComponent(message)}`, request.url), 303);
  }
}
