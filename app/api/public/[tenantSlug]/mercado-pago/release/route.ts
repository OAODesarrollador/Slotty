import { NextRequest, NextResponse } from "next/server";

import { fail, ok } from "@/lib/http";
import { requireTenantBySlug } from "@/lib/tenant";
import { expirePendingMercadoPagoAppointment } from "@/repositories/appointments";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);

  const body = await request.json().catch(() => null) as { appointmentId?: unknown } | null;
  const appointmentId = typeof body?.appointmentId === "string" ? body.appointmentId : "";

  if (!appointmentId) {
    return fail("appointmentId es requerido.", 400);
  }

  const released = await expirePendingMercadoPagoAppointment(tenant.tenantId, appointmentId);
  return ok({ released });
}
