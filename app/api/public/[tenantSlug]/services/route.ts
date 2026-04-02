import { requireTenantBySlug } from "@/lib/tenant";
import { ok } from "@/lib/http";
import { listPublicServices } from "@/repositories/services";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const services = await listPublicServices(tenant.tenantId);
  return ok({ services });
}
