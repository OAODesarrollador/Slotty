import {
  APPOINTMENT_STATUS_LABELS,
  APPOINTMENT_STATUS_OPTIONS,
  AdminPageShell,
  Link,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
  buildAppointmentsHref,
  getAdminPageData
} from "../_shared";
import { AdminAppointmentsBoard } from "@/components/admin-appointments-board";

export default async function OwnerAppointmentsPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string }>;
  searchParams: Promise<{ date?: string; barberId?: string; error?: string; notice?: string }>;
}) {
  const { tenant: slug } = await params;
  const search = await searchParams;
  const data = await getAdminPageData(slug, search);
  const selectedBarber = data.selectedBarber;
  const selectedBarberServiceIds = selectedBarber ? (data.serviceIdsByBarber.get(selectedBarber.id) ?? []) : [];
  const serviceOptions = data.services
    .filter((service) => service.is_active && selectedBarberServiceIds.includes(service.id))
    .map((service) => ({
      value: service.id,
      label: `${service.name} · ${service.duration_minutes} min`
    }));
  const paymentOptions = [
    data.tenantSettings?.allow_pay_at_store ? { value: "pay_at_store", label: "En local" } : null,
    data.tenantSettings?.allow_bank_transfer ? { value: "bank_transfer", label: "Transferencia" } : null,
    data.tenantSettings?.allow_mercado_pago ? { value: "mercado_pago", label: "Mercado Pago" } : null
  ].filter((item): item is { value: string; label: string } => Boolean(item));

  return (
    <AdminPageShell
      tenantName={data.tenant.tenantName}
      session={data.session}
      eyebrow="Gestion de turnos"
      description="Agenda, estados y turnos divididos por barbero."
      error={data.error}
      notice={data.notice}
    >
      <section className="stack" style={{ gap: 20 }}>
        <article className="card stack" style={{ padding: 24, gap: 18 }}>
          <div className="header-row">
            <div className="stack" style={{ gap: 4 }}>
              <span className="eyebrow">Gestion de turnos</span>
              <h2 style={{ fontSize: "1.45rem" }}>Agenda por barbero en solapas</h2>
            </div>
            <form method="get" action={`/${slug}/owner/dashboard/turnos`} style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <input type="hidden" name="barberId" value={data.selectedBarberId} />
              <input type="date" name="date" defaultValue={data.scheduleDate} />
              <button className="btn-ghost" type="submit">Ver fecha</button>
            </form>
          </div>

          <div className="admin-tabs">
            {data.barbers.map((barber) => {
              const appointmentsCount = (data.appointmentsByBarber.get(barber.id) ?? []).length;
              return (
                <Link
                  key={barber.id}
                  href={buildAppointmentsHref(slug, data.scheduleDate, barber.id)}
                  className={`admin-tab ${barber.id === data.selectedBarberId ? "is-active" : ""}`}
                >
                  <strong>{barber.full_name}</strong>
                  <small>{appointmentsCount} turnos</small>
                </Link>
              );
            })}
          </div>

          {selectedBarber ? (
            <div className="card stack" style={{ padding: 20, gap: 16, background: "rgba(255,255,255,0.02)" }}>
              <div className="header-row" style={{ alignItems: "center" }}>
                <div className="stack" style={{ gap: 4 }}>
                  <strong style={{ fontSize: "1.1rem" }}>{selectedBarber.full_name}</strong>
                  <small className="muted">{data.selectedBarberAppointments.length} turnos el {data.scheduleDate}</small>
                </div>
                <span className="status-pill">{selectedBarber.is_active ? "Activo" : "Inactivo"}</span>
              </div>

              {data.selectedBarberSlots.length > 0 ? (
                <AdminAppointmentsBoard
                  tenantSlug={slug}
                  serviceOptions={serviceOptions}
                  paymentOptions={paymentOptions}
                  statusOptions={APPOINTMENT_STATUS_OPTIONS.map((status) => ({
                    value: status,
                    label: APPOINTMENT_STATUS_LABELS[status]
                  }))}
                  slots={data.selectedBarberSlots.map((slot) => (
                    slot.appointment
                      ? {
                          kind: "occupied" as const,
                          key: `${slot.start.toISOString()}-${slot.appointment.id}`,
                          startLabel: slot.start.toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: data.tenant.timezone
                          }),
                          endLabel: slot.end.toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: data.tenant.timezone
                          }),
                          barberId: selectedBarber.id,
                          scheduleDate: data.scheduleDate,
                          appointmentId: slot.appointment.id,
                          customerName: slot.appointment.customer_name,
                          serviceName: slot.appointment.service_name,
                          appointmentStatusLabel: APPOINTMENT_STATUS_LABELS[slot.appointment.status],
                          paymentMethodLabel: slot.appointment.payment_method ? PAYMENT_METHOD_LABELS[slot.appointment.payment_method] : "Sin pago",
                          paymentStatusLabel: slot.appointment.payment_status ? PAYMENT_STATUS_LABELS[slot.appointment.payment_status] : "Sin estado",
                          currentStatus: slot.appointment.status
                        }
                      : {
                          kind: "free" as const,
                          key: slot.start.toISOString(),
                          barberId: selectedBarber.id,
                          scheduleDate: data.scheduleDate,
                          scheduledAt: slot.start.toISOString(),
                          startLabel: slot.start.toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: data.tenant.timezone
                          }),
                          endLabel: slot.end.toLocaleTimeString("es-AR", {
                            hour: "2-digit",
                            minute: "2-digit",
                            hour12: false,
                            timeZone: data.tenant.timezone
                          })
                        }
                  ))}
                />
              ) : (
                <div className="notice">Este barbero no tiene horario laboral configurado para la fecha elegida.</div>
              )}
            </div>
          ) : (
            <div className="notice">No hay barberos cargados para mostrar en la agenda.</div>
          )}
        </article>
      </section>
    </AdminPageShell>
  );
}
