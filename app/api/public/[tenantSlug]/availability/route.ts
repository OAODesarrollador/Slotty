import { fail, ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { listAvailabilityOptions } from "@/services/availability";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const { searchParams } = new URL(request.url);
  const serviceId = searchParams.get("serviceId");
  const barberId = searchParams.get("barberId");

  if (!serviceId) {
    return fail("serviceId es obligatorio.");
  }

  const availability = await listAvailabilityOptions(tenant, serviceId, barberId);
  return ok(availability);
}
