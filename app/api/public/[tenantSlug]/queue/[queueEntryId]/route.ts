import { ok, fail } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { getQueueEntryDetail } from "@/repositories/queue";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string; queueEntryId: string }> }
) {
  const { tenantSlug, queueEntryId } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const queueEntry = await getQueueEntryDetail(tenant.tenantId, queueEntryId);

  if (!queueEntry) {
    return fail("Entrada de fila no encontrada.", 404);
  }

  return ok({
    queueEntry: {
      ...queueEntry,
      peopleAhead: queueEntry.status === "waiting" ? Math.max((queueEntry.position ?? 1) - 1, 0) : 0
    }
  });
}
