import Link from "next/link";
import { notFound } from "next/navigation";

import { requireTenantBySlug } from "@/lib/tenant";
import { formatCurrency, formatDateTime } from "@/lib/time";
import { getAppointmentDetail } from "@/repositories/appointments";

export default async function AppointmentDetailPage({
  params
}: {
  params: Promise<{ tenant: string; appointmentId: string }>;
}) {
  const { tenant: slug, appointmentId } = await params;
  const tenant = await requireTenantBySlug(slug);
  const appointment = await getAppointmentDetail(tenant.tenantId, appointmentId);

  if (!appointment) {
    notFound();
  }

  // Traducción de estados para el usuario
  const statusMap: Record<string, string> = {
    scheduled: "Turno Confirmado",
    pending_payment: "Esperando Pago",
    pending_verification: "Verificando Comprobante",
    confirmed: "Cita Asegurada",
    cancelled: "Turno Cancelado"
  };

  const paymentStatusMap: Record<string, string> = {
    approved: "Pago Aprobado",
    pending: "Pago Pendiente",
    rejected: "Pago Rechazado",
    pending_verification: "En Verificación"
  };

  return (
    <main className="page">
      <section className="shell shadow-2xl" style={{ maxWidth: "800px", margin: "0 auto" }}>
        <section className="summary stack" style={{ padding: "40px" }}>
          <div style={{ textAlign: "center", marginBottom: "20px" }}>
             <div style={{ display: "inline-flex", background: "rgba(104, 208, 161, 0.15)", color: "var(--success)", padding: "12px", borderRadius: "50%", marginBottom: "16px" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
             </div>
             <span className="eyebrow" style={{ display: "block", marginBottom: "8px", letterSpacing: "4px" }}>RESERVA EXITOSA</span>
             <h1 style={{ fontSize: "2.5rem" }}>¡Tu espacio está asegurado!</h1>
             <p className="muted" style={{ marginTop: "12px" }}>
               Gracias por confiar en {tenant.tenantName}. Hemos registrado tu turno correctamente y ya podés verlo en nuestro sistema.
             </p>
          </div>

          <div className="card shadow-inner" style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--line)", borderRadius: "32px", padding: "32px", position: "relative", overflow: "hidden" }}>
            {/* Decoración Estética */}
            <div style={{ position: "absolute", top: -20, right: -20, width: "100px", height: "100px", background: "var(--accent)", opacity: 0.05, borderRadius: "50%", filter: "blur(40px)" }} />

            <div className="grid cols-2" style={{ gap: "32px" }}>
              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.6 }}>SERVICIO</span>
                <strong style={{ fontSize: "1.2rem" }}>{appointment.service_name}</strong>
              </div>
              
              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.6 }}>EXPERTO</span>
                <strong style={{ fontSize: "1.2rem" }}>{appointment.barber_name}</strong>
              </div>

              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.6 }}>CITA CONFIRMADA</span>
                <strong style={{ fontSize: "1.2rem", color: "var(--accent)" }}>{formatDateTime(appointment.datetime_start, tenant.timezone)}</strong>
              </div>

              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.6 }}>ESTADO ACTUAL</span>
                <span className="status-pill" style={{ alignSelf: "start", background: "rgba(104, 208, 161, 0.1)", color: "var(--success)", borderColor: "rgba(104, 208, 161, 0.2)" }}>
                   {statusMap[appointment.status] || appointment.status}
                </span>
              </div>

              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.6 }}>GESTIÓN DE PAGO</span>
                <span className="status-pill" style={{ alignSelf: "start" }}>
                   {paymentStatusMap[appointment.payment_status || ""] || "Pendiente de Cobro"}
                </span>
              </div>

              <div className="stack" style={{ gap: 4 }}>
                <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.6 }}>INVERSIÓN</span>
                <span className="price-tag" style={{ fontSize: "1.5rem" }}>{formatCurrency(appointment.total_amount ?? appointment.price)}</span>
              </div>
            </div>
            
            <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px dashed var(--line)", textAlign: "center" }}>
               <small className="muted" style={{ fontStyle: "italic" }}>ID de Referencia: {appointmentId.split("-")[0].toUpperCase()}</small>
            </div>
          </div>

          <div className="actions" style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px" }}>
            <Link className="btn" href={`/${slug}`} style={{ height: "60px" }}>
              Finalizar y Volver al Inicio
            </Link>
            <p className="muted" style={{ textAlign: "center", fontSize: "0.85rem" }}>
              ¿Necesitás reprogramar? Comunicate directamente con la sede.
            </p>
          </div>
        </section>
      </section>
    </main>
  );
}
