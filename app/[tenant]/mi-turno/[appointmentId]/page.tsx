import Link from "next/link";
import { notFound } from "next/navigation";

import { AppointmentReceiptActions } from "@/components/appointment-receipt-actions";
import { buildReceiptFilename, formatAppointmentStatusLabel } from "@/lib/appointment-receipt";
import { requireTenantBySlug } from "@/lib/tenant";
import { formatCurrency, formatDateTime } from "@/lib/time";
import { expirePendingMercadoPagoAppointment, getAppointmentDetail } from "@/repositories/appointments";
import { getTenantBookingSettings } from "@/repositories/tenants";
import { syncMercadoPagoPayment } from "@/services/mercado-pago";

function formatMercadoPagoStatus(status: string) {
  const statusMap: Record<string, string> = {
    approved: "aprobado",
    pending: "pendiente",
    in_process: "en proceso",
    in_mediation: "en mediacion",
    rejected: "rechazado",
    cancelled: "cancelado",
    refunded: "reintegrado",
    charged_back: "desconocido por contracargo"
  };

  return statusMap[status] ?? status;
}

function sanitizeMercadoPagoParam(value?: string) {
  if (!value) {
    return "";
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized || normalized === "null" || normalized === "undefined") {
    return "";
  }

  return value.trim();
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function isNonCriticalMercadoPagoSyncError(error: unknown) {
  const message = getErrorMessage(error);
  return message.startsWith("No se pudo verificar el pago en Mercado Pago.");
}

function buildMercadoPagoReturnNotice(input: {
  returnType: string;
  syncResult: Awaited<ReturnType<typeof syncMercadoPagoPayment>> | null;
  search: {
    status?: string;
    collection_status?: string;
    status_detail?: string;
  };
}) {
  const remoteStatus = sanitizeMercadoPagoParam(input.search.status ?? input.search.collection_status);
  const statusDetail = sanitizeMercadoPagoParam(input.search.status_detail);

  if (input.returnType === "failure") {
    const details: string[] = ["Mercado Pago devolvió el checkout sin completar correctamente la operación."];

    if (remoteStatus) {
      details.push(`Estado informado: ${formatMercadoPagoStatus(remoteStatus)}.`);
    }

    if (statusDetail) {
      details.push(`Detalle: ${statusDetail}.`);
    }

    details.push("La reserva pendiente fue liberada y necesitás iniciar el pago nuevamente.");
    return details.join(" ");
  }

  if (input.returnType === "success" || input.returnType === "pending") {
    if (input.syncResult?.synced === false) {
      return "Hubo un problema al vincular el pago devuelto por Mercado Pago con esta reserva. Revisá el estado antes de confirmar el turno.";
    }

    if (input.syncResult?.synced && input.syncResult.status === "approved" && !input.syncResult.amountMatches) {
      return `Mercado Pago informó un cobro de ${formatCurrency(input.syncResult.paidAmount)}, pero el sistema esperaba ${formatCurrency(input.syncResult.expectedAmount)}. La reserva quedó en verificación manual.`;
    }

    if (input.syncResult?.synced && input.syncResult.status && input.syncResult.status !== "approved") {
      return `Mercado Pago devolvió el pago con estado ${formatMercadoPagoStatus(input.syncResult.status)}. El cobro todavía no quedó validado en la reserva.`;
    }

    if (input.returnType === "pending") {
      return "Mercado Pago devolvió el checkout sin acreditar el pago. La reserva sigue pendiente hasta validar el cobro.";
    }
  }

  return null;
}

export default async function AppointmentDetailPage({
  params,
  searchParams
}: {
  params: Promise<{ tenant: string; appointmentId: string }>;
  searchParams: Promise<{
    payment_id?: string;
    collection_id?: string;
    mp_return?: string;
    collection_status?: string;
    status?: string;
    status_detail?: string;
  }>;
}) {
  const { tenant: slug, appointmentId } = await params;
  const search = await searchParams;

  try {
    const tenant = await requireTenantBySlug(slug);
    const tenantSettings = await getTenantBookingSettings(tenant.tenantId);
    const paymentId = search.payment_id ?? search.collection_id ?? "";
    const returnType = search.mp_return ?? "";
    let mercadoPagoSyncResult:
      | Awaited<ReturnType<typeof syncMercadoPagoPayment>>
      | null = null;

    if (paymentId && tenantSettings?.mercado_pago_access_token) {
      mercadoPagoSyncResult = await syncMercadoPagoPayment({
        tenantId: tenant.tenantId,
        accessToken: tenantSettings.mercado_pago_access_token,
        paymentId,
        expectedAppointmentId: appointmentId
      }).catch((error: unknown) => {
        if (isNonCriticalMercadoPagoSyncError(error)) {
          console.warn(
            `NON-BLOCKING MERCADO PAGO SYNC ISSUE: ${appointmentId}. ${getErrorMessage(error)}`
          );
          return null;
        }

        console.error(`ERROR SYNCING MERCADO PAGO PAYMENT: ${appointmentId}`);
        console.error(error);
        return null;
      });
    }

    if (returnType === "failure") {
      await expirePendingMercadoPagoAppointment(tenant.tenantId, appointmentId).catch((error: unknown) => {
        console.error(`ERROR RELEASING FAILED MERCADO PAGO APPOINTMENT: ${appointmentId}`);
        console.error(error);
      });
    }

    const appointment = await getAppointmentDetail(tenant.tenantId, appointmentId);

    if (!appointment) {
      console.warn(`APPOINTMENT NOT FOUND: ${appointmentId} for tenant ${slug}`);
      notFound();
    }

    const statusMap: Record<string, string> = {
      scheduled: "Turno Confirmado",
      pending_payment: "Esperando Pago",
      pending_verification: "Verificando Comprobante",
      confirmed: "Cita Asegurada",
      cancelled: "Turno Cancelado",
      expired: "Turno Expirado"
    };

    const paymentStatusMap: Record<string, string> = {
      approved: "Pago Aprobado",
      pending: "Pago Pendiente",
      rejected: "Pago Rechazado",
      pending_verification: "En Verificación",
      cancelled: "Pago Cancelado",
      refunded: "Pago Reintegrado"
    };

    const hasFailedMercadoPagoReturn =
      returnType === "failure" ||
      appointment.status === "expired" ||
      appointment.payment_status === "rejected" ||
      appointment.payment_status === "cancelled";

    const heroContent =
      hasFailedMercadoPagoReturn
        ? {
            eyebrow: "PAGO NO CONFIRMADO",
            title: "El pago no se completó y el turno no quedó confirmado.",
            subtitle: `No pudimos registrar el cobro de tu reserva en ${tenant.tenantName}. Revisá el estado actual e iniciá una nueva reserva para volver a intentarlo.`,
            tone: {
              background: "rgba(255, 170, 64, 0.12)",
              color: "#ffd18b"
            },
            icon: "warning" as const
          }
        : appointment.payment_status === "approved"
        ? {
            eyebrow: "PAGO CONFIRMADO",
            title: "Pago confirmado. Tu turno está reservado.",
            subtitle: `El pago de tu reserva fue registrado correctamente en ${tenant.tenantName}. Ya podés ver el detalle completo de tu turno.`,
            tone: {
              background: "rgba(104, 208, 161, 0.15)",
              color: "var(--success)"
            },
            icon: "success" as const
          }
        : appointment.status === "pending_verification"
          ? {
              eyebrow: "RESERVA REGISTRADA",
              title: "Reserva registrada. Estamos verificando tu pago.",
              subtitle: `Tu solicitud ya fue registrada en ${tenant.tenantName}. El turno quedará confirmado cuando terminemos de validar el pago informado.`,
              tone: {
                background: "rgba(245, 200, 66, 0.14)",
                color: "var(--accent)"
              },
              icon: "success" as const
            }
          : appointment.status === "pending_payment"
            ? {
                eyebrow: "RESERVA INICIADA",
                title: "Reserva iniciada. Falta confirmar el pago.",
                subtitle: `Registramos tu reserva en ${tenant.tenantName}, pero todavía necesitamos la confirmación del pago para cerrar el proceso.`,
                tone: {
                  background: "rgba(245, 200, 66, 0.14)",
                  color: "var(--accent)"
                },
                icon: "success" as const
              }
            : appointment.status === "scheduled" && appointment.payment_status === "pending"
              ? {
                  eyebrow: "TURNO REGISTRADO",
                  title: "Turno registrado. Pagás en el local.",
                  subtitle: `Tu turno ya quedó agendado en ${tenant.tenantName}. El pago se completa directamente en la sede el día de la atención.`,
                  tone: {
                    background: "rgba(104, 208, 161, 0.15)",
                    color: "var(--success)"
                  },
                  icon: "success" as const
                }
              : {
                  eyebrow: "RESERVA REGISTRADA",
                  title: "Tu turno fue registrado correctamente.",
                  subtitle: `Gracias por confiar en ${tenant.tenantName}. Ya podés ver el detalle actual de tu reserva en el sistema.`,
                  tone: {
                    background: "rgba(104, 208, 161, 0.15)",
                    color: "var(--success)"
                  },
                  icon: "success" as const
                };

    const totalAmount = Number(appointment.total_amount ?? appointment.price ?? 0);
    const amountRequiredNow = Number(appointment.amount_required_now ?? 0);
    const amountPaidNow = Number(appointment.amount_paid ?? 0);
    const amountPending = Math.max(0, totalAmount - amountRequiredNow);
    const nowAmount = amountPaidNow > 0 ? amountPaidNow : amountRequiredNow;
    const mercadoPagoReturnNotice = buildMercadoPagoReturnNotice({
      returnType,
      syncResult: mercadoPagoSyncResult,
      search
    });
    const receiptAvailable = !hasFailedMercadoPagoReturn;
    const receiptFilename = buildReceiptFilename(tenant.tenantName);
    const receiptDownloadUrl = `/api/public/${slug}/appointments/${appointmentId}/receipt`;
    const receiptShareText = `Te comparto el comprobante de mi reserva en ${tenant.tenantName}. Estado: ${formatAppointmentStatusLabel(appointment.status)}.`;
    const nowLabel =
      amountRequiredNow <= 0
        ? null
        : appointment.payment_status === "approved"
          ? amountRequiredNow < totalAmount
            ? "Seña confirmada"
            : "Pago confirmado"
          : appointment.status === "pending_verification"
            ? amountRequiredNow < totalAmount
              ? "Seña a verificar"
              : "Pago a verificar"
            : appointment.status === "pending_payment"
              ? amountRequiredNow < totalAmount
                ? "Seña a confirmar"
                : "Pago a confirmar"
              : amountRequiredNow < totalAmount
                ? "Seña solicitada"
                : "Pago solicitado";

    return (
      <main className="page">
        <section className="shell shadow-2xl" style={{ maxWidth: "800px", margin: "0 auto" }}>
          <section className="summary stack" style={{ padding: "40px" }}>
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <div style={{ display: "inline-flex", background: heroContent.tone.background, color: heroContent.tone.color, padding: "12px", borderRadius: "50%", marginBottom: "16px" }}>
                {heroContent.icon === "warning" ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                )}
              </div>
              <span className="eyebrow" style={{ display: "block", marginBottom: "8px", letterSpacing: "4px", color: heroContent.tone.color }}>{heroContent.eyebrow}</span>
              <h1 style={{ fontSize: "2.5rem" }}>{heroContent.title}</h1>
              <p className="muted" style={{ marginTop: "12px" }}>
                {heroContent.subtitle}
              </p>
            </div>

            {mercadoPagoReturnNotice ? (
              <div
                className="notice"
                style={{
                  fontSize: "0.92rem",
                  padding: "14px 16px",
                  background: "rgba(255, 170, 64, 0.12)",
                  border: "1px solid rgba(255, 170, 64, 0.35)",
                  borderRadius: "16px",
                  color: "rgba(255,255,255,0.92)"
                }}
              >
                <strong style={{ display: "block", marginBottom: "6px", color: "#ffd18b" }}>Hubo un problema o diferencia en el pago</strong>
                <span>{mercadoPagoReturnNotice}</span>
              </div>
            ) : null}

            <div className="card shadow-inner" style={{ background: "rgba(255, 255, 255, 0.01)", border: "1px solid var(--line)", borderRadius: "32px", padding: "32px", position: "relative", overflow: "hidden" }}>
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
                  <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.6 }}>TOTAL DEL SERVICIO</span>
                  <span className="price-tag" style={{ fontSize: "1.5rem" }}>{formatCurrency(totalAmount)}</span>
                </div>

                {nowLabel ? (
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.6 }}>{nowLabel.toUpperCase()}</span>
                    <strong style={{ fontSize: "1.2rem", color: "var(--accent)" }}>{formatCurrency(nowAmount)}</strong>
                  </div>
                ) : null}

                {amountPending > 0 ? (
                  <div className="stack" style={{ gap: 4 }}>
                    <span className="eyebrow" style={{ fontSize: "0.6rem", opacity: 0.6 }}>SALDO PENDIENTE</span>
                    <strong style={{ fontSize: "1.2rem" }}>{formatCurrency(amountPending)}</strong>
                  </div>
                ) : null}
              </div>

              <div style={{ marginTop: "32px", paddingTop: "24px", borderTop: "1px dashed var(--line)", textAlign: "center" }}>
                <small className="muted" style={{ fontStyle: "italic" }}>ID de Referencia: {appointmentId.split("-")[0].toUpperCase()}</small>
              </div>
            </div>

            {receiptAvailable ? (
              <AppointmentReceiptActions
                downloadUrl={receiptDownloadUrl}
                filename={receiptFilename}
                shareTitle={`Comprobante de reserva - ${tenant.tenantName}`}
                shareText={receiptShareText}
                fallbackSharePath={`/${slug}/mi-turno/${appointmentId}`}
              />
            ) : null}

            <div className="actions" style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "24px" }}>
              {mercadoPagoReturnNotice ? (
                <Link className="btn" href={`/${slug}/reservar`} style={{ height: "60px" }}>
                  Intentar nueva reserva
                </Link>
              ) : null}
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
  } catch (error: unknown) {
    console.error(`ERROR LOADING APPOINTMENT DETAIL: ${appointmentId}`);
    console.error(error);
    throw error;
  }
}
