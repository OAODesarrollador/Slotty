import { fail, ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { availabilityQuerySchema } from "@/lib/validators";
import { getAvailableSlotsByDate } from "@/services/availability";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const { searchParams } = new URL(request.url);

  const parsed = availabilityQuerySchema.safeParse({
    serviceId: searchParams.get("serviceId"),
    date: searchParams.get("date"),
    barberId: searchParams.get("barberId") ?? undefined
  });

  if (!parsed.success) {
    return fail("Query inválida.", 400, parsed.error.flatten());
  }

  try {
    const availability = await getAvailableSlotsByDate({
      tenantId: tenant.tenantId,
      timezone: tenant.timezone,
      serviceId: parsed.data.serviceId,
      date: parsed.data.date,
      barberId: parsed.data.barberId
    });

    return ok(availability);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "No se pudo obtener disponibilidad.";
    return fail(message, message === "Servicio no encontrado." ? 404 : 400);
  }
}
