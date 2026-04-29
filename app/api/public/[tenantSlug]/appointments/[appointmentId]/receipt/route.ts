import { requireTenantBySlug } from "@/lib/tenant";
import { buildAppointmentReceiptPdf, buildReceiptFilename } from "@/lib/appointment-receipt";
import { getAppointmentDetail } from "@/repositories/appointments";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tenantSlug: string; appointmentId: string }> }
) {
  const { tenantSlug, appointmentId } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const appointment = await getAppointmentDetail(tenant.tenantId, appointmentId);

  if (!appointment) {
    return new Response("Reserva no encontrada.", { status: 404 });
  }

  const pdf = buildAppointmentReceiptPdf({
    tenantName: tenant.tenantName,
    timezone: tenant.timezone,
    appointmentId,
    customerName: appointment.customer_name,
    serviceName: appointment.service_name,
    datetimeStart: appointment.datetime_start,
    barberName: appointment.barber_name,
    appointmentStatus: appointment.status,
    paymentMethod: appointment.payment_method,
    paymentStatus: appointment.payment_status,
    issuedAt: new Date()
  });

  return new Response(pdf, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${buildReceiptFilename(tenant.tenantName)}"`,
      "Cache-Control": "no-store"
    }
  });
}
