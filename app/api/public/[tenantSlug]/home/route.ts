import { requireTenantBySlug } from "@/lib/tenant";
import { ok } from "@/lib/http";
import { listPublicServices } from "@/repositories/services";
import { getTenantSettings } from "@/repositories/tenants";
import { listAvailabilityOptions } from "@/services/availability";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const services = await listPublicServices(tenant.tenantId);
  const firstService = services[0];
  const suggested = firstService ? await listAvailabilityOptions(tenant, firstService.id) : null;
  const settings = await getTenantSettings(tenant.tenantId);

  return ok({
    tenant,
    settings,
    services,
    suggestedSlots: suggested?.options ?? []
  });
}
