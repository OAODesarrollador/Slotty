import { ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { getAppointmentDetail } from "@/repositories/appointments";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string; appointmentId: string }> }
) {
  const { tenantSlug, appointmentId } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const appointment = await getAppointmentDetail(tenant.tenantId, appointmentId);
  return ok({ appointment });
}
