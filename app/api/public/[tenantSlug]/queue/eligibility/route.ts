import { fail, ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { queueEligibilityQuerySchema } from "@/lib/validators";
import { getServiceById } from "@/repositories/services";
import { getQueueJoinEligibility } from "@/services/queue";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const { searchParams } = new URL(request.url);

  const parsed = queueEligibilityQuerySchema.safeParse({
    serviceId: searchParams.get("serviceId"),
    barberId: searchParams.get("barberId") ?? undefined
  });

  if (!parsed.success) {
    return fail("Query inválida.", 400, parsed.error.flatten());
  }

  try {
    const service = await getServiceById(tenant.tenantId, parsed.data.serviceId);
    if (!service) {
      return fail("Servicio no encontrado.", 404);
    }

    const eligibility = await getQueueJoinEligibility({
      tenant,
      serviceId: parsed.data.serviceId,
      preferredBarberId: parsed.data.barberId ?? null,
      serviceDurationMinutes: service.duration_minutes
    });

    return ok(eligibility);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo validar la fila virtual.";
    return fail(message, 400);
  }
}
