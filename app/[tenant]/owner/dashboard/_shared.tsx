import Link from "next/link";
import type { ReactNode } from "react";

import { AdminFormValidation } from "@/components/admin-form-validation";
import { canManageCompany, canManageUsers, getManagementRoleLabel } from "@/lib/admin";
import { requireSessionForTenant } from "@/lib/auth";
import {
  addMinutes,
  buildZonedDate,
  dateKeyInTimeZone,
  formatCurrency,
  formatHour,
  nextDay,
  weekdayFromDateKey
} from "@/lib/time";
import type { AppointmentStatus } from "@/lib/types";
import { requireTenantBySlug } from "@/lib/tenant";
import { getAppointmentsByBarberSummary, getTenantAnalyticsSummary } from "@/repositories/analytics";
import { listAppointmentsForTenantDay } from "@/repositories/appointments";
import { listAdminBarbers, listBarberServiceLinks, listWorkingHoursForBarbers } from "@/repositories/barbers";
import { listAdminServices } from "@/repositories/services";
import { getTenantSettings } from "@/repositories/tenants";
import { listTenantUsers } from "@/repositories/users";

export const WEEKDAY_LABELS = ["Dom", "Lun", "Mar", "Mie", "Jue", "Vie", "Sab"];

export const APPOINTMENT_STATUS_OPTIONS = [
  "scheduled",
  "confirmed",
  "checked_in",
  "in_progress",
  "completed",
  "cancelled",
  "no_show"
] as const;

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending_payment: "Pendiente de pago",
  pending_verification: "Pendiente de verificacion",
  scheduled: "Programado",
  confirmed: "Confirmado",
  checked_in: "Presente",
  in_progress: "En curso",
  completed: "Completado",
  cancelled: "Cancelado",
  no_show: "No asistio",
  expired: "Vencido"
};

export const PAYMENT_METHOD_LABELS = {
  pay_at_store: "En local",
  bank_transfer: "Transferencia",
  mercado_pago: "Mercado Pago"
} as const;

export const PAYMENT_STATUS_LABELS = {
  pending: "Pendiente",
  pending_verification: "A verificar",
  approved: "Aprobado",
  rejected: "Rechazado",
  expired: "Vencido",
  cancelled: "Cancelado",
  refunded: "Devuelto"
} as const;

const ADMIN_APPOINTMENT_SLOT_MINUTES = 15;

export type AdminSearchParams = {
  date?: string;
  barberId?: string;
  error?: string;
  notice?: string;
};

export function buildAdminPath(
  slug: string,
  page: "overview" | "appointments" | "services" | "company" | "analytics",
  extraParams?: Record<string, string | undefined>
) {
  const pathnameByPage = {
    overview: `/${slug}/owner/dashboard`,
    appointments: `/${slug}/owner/dashboard/turnos`,
    services: `/${slug}/owner/dashboard/servicios`,
    company: `/${slug}/owner/dashboard/empresa`,
    analytics: `/${slug}/owner/dashboard/analisis`
  } as const;

  const pathname = pathnameByPage[page];
  if (!extraParams || Object.values(extraParams).every((value) => !value)) {
    return pathname;
  }

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(extraParams)) {
    if (value) {
      params.set(key, value);
    }
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function buildAppointmentsHref(slug: string, scheduleDate: string, barberId?: string) {
  return buildAdminPath(slug, "appointments", {
    date: scheduleDate,
    barberId
  });
}

export function getRoleBadgeStyle(isPrimary = false) {
  return {
    background: isPrimary ? "rgba(245, 200, 66, 0.16)" : "rgba(255,255,255,0.06)",
    color: isPrimary ? "var(--accent)" : "var(--text)",
    borderColor: isPrimary ? "rgba(245, 200, 66, 0.22)" : "rgba(255,255,255,0.08)"
  };
}

export async function getAdminPageData(slug: string, search: AdminSearchParams) {
  const tenant = await requireTenantBySlug(slug);
  const session = await requireSessionForTenant(slug);

  const scheduleDate = search.date || dateKeyInTimeZone(new Date(), tenant.timezone);
  const scheduleStart = buildZonedDate(scheduleDate, "00:00", tenant.timezone);
  const scheduleEnd = buildZonedDate(dateKeyInTimeZone(nextDay(scheduleStart), tenant.timezone), "00:00", tenant.timezone);

  const [
    tenantSettings,
    services,
    barbers,
    barberServiceLinks,
    users,
    analytics,
    appointmentsForDay,
    appointmentsByBarberSummary
  ] = await Promise.all([
    getTenantSettings(tenant.tenantId),
    listAdminServices(tenant.tenantId),
    listAdminBarbers(tenant.tenantId),
    listBarberServiceLinks(tenant.tenantId),
    listTenantUsers(tenant.tenantId),
    getTenantAnalyticsSummary(tenant.tenantId),
    listAppointmentsForTenantDay(tenant.tenantId, scheduleStart, scheduleEnd),
    getAppointmentsByBarberSummary(tenant.tenantId)
  ]);

  const barberIds = barbers.map((barber) => barber.id);
  const workingHoursRows = barberIds.length > 0 ? await listWorkingHoursForBarbers(tenant.tenantId, barberIds) : [];

  const serviceIdsByBarber = new Map<string, string[]>();
  for (const link of barberServiceLinks) {
    const current = serviceIdsByBarber.get(link.barber_id) ?? [];
    current.push(link.service_id);
    serviceIdsByBarber.set(link.barber_id, current);
  }

  const workingHoursByBarber = new Map<string, Array<{ day_of_week: number; start_time: string; end_time: string }>>();
  for (const row of workingHoursRows) {
    const current = workingHoursByBarber.get(row.barber_id) ?? [];
    current.push(row);
    workingHoursByBarber.set(row.barber_id, current);
  }

  const appointmentsByBarber = new Map<string, typeof appointmentsForDay>();
  for (const appointment of appointmentsForDay) {
    const current = appointmentsByBarber.get(appointment.barber_id) ?? [];
    current.push(appointment);
    appointmentsByBarber.set(appointment.barber_id, current);
  }

  const isAdmin = canManageCompany(session.role);
  const canEditUsers = canManageUsers(session.role);
  const selectedBarberId = search.barberId && barbers.some((barber) => barber.id === search.barberId)
    ? search.barberId
    : (barbers[0]?.id ?? "");
  const selectedBarber = barbers.find((barber) => barber.id === selectedBarberId) ?? null;
  const selectedBarberAppointments = selectedBarber ? (appointmentsByBarber.get(selectedBarber.id) ?? []) : [];
  const selectedBarberWorkingDay = selectedBarber
    ? (workingHoursByBarber.get(selectedBarber.id) ?? []).find((item) => item.day_of_week === weekdayFromDateKey(scheduleDate, tenant.timezone))
    : null;

  const selectedBarberSlots = (() => {
    if (!selectedBarberWorkingDay) {
      return [];
    }

    const slots: Array<{
      start: Date;
      end: Date;
      appointment: (typeof selectedBarberAppointments)[number] | null;
    }> = [];

    let cursor = buildZonedDate(scheduleDate, selectedBarberWorkingDay.start_time.slice(0, 5), tenant.timezone);
    const dayEnd = buildZonedDate(scheduleDate, selectedBarberWorkingDay.end_time.slice(0, 5), tenant.timezone);

    while (cursor < dayEnd) {
      const slotEnd = addMinutes(cursor, ADMIN_APPOINTMENT_SLOT_MINUTES);
      if (slotEnd > dayEnd) {
        break;
      }

      const appointment = selectedBarberAppointments.find((item) => {
        const appointmentStart = new Date(item.datetime_start);
        const appointmentEnd = new Date(item.datetime_end);
        return cursor >= appointmentStart && cursor < appointmentEnd;
      }) ?? null;

      if (appointment) {
        const appointmentStart = new Date(appointment.datetime_start);
        const appointmentEnd = new Date(appointment.datetime_end);

        slots.push({
          start: appointmentStart,
          end: appointmentEnd,
          appointment
        });

        cursor = appointmentEnd;
        continue;
      }

      slots.push({ start: cursor, end: slotEnd, appointment: null });
      cursor = slotEnd;
    }

    return slots;
  })();

  return {
    slug,
    tenant,
    session,
    scheduleDate,
    tenantSettings,
    services,
    barbers,
    users,
    analytics,
    appointmentsByBarberSummary,
    appointmentsByBarber,
    serviceIdsByBarber,
    workingHoursByBarber,
    selectedBarberId,
    selectedBarber,
    selectedBarberAppointments,
    selectedBarberSlots,
    isAdmin,
    canEditUsers,
    error: search.error,
    notice: search.notice
  };
}

export function AdminPageShell({
  tenantName,
  session,
  eyebrow,
  description,
  error,
  notice,
  children
}: {
  tenantName: string;
  session: { displayName: string; email: string; role: string };
  eyebrow: string;
  description: string;
  error?: string;
  notice?: string;
  children: ReactNode;
}) {
  return (
    <main className="page admin-page" style={{ padding: "40px 24px 80px" }}>
      <AdminFormValidation />
      <section className="shell stack" style={{ gap: 28 }}>
        <header className="stack" style={{ gap: 16 }}>
          <div className="header-row" style={{ alignItems: "start" }}>
            <div className="stack" style={{ gap: 8, maxWidth: 780 }}>
              <span className="eyebrow">{eyebrow}</span>
              <h1 style={{ fontSize: "2.3rem", lineHeight: 1.02 }}>{tenantName}</h1>
              <p className="page-lead" style={{ maxWidth: 760, margin: 0 }}>
                {description}
              </p>
            </div>
            <div className="card stack" style={{ gap: 8, minWidth: 280, padding: 18 }}>
              <small className="muted">Usuario activo</small>
              <strong style={{ fontSize: "1.05rem" }}>{session.displayName}</strong>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="status-pill" style={getRoleBadgeStyle(session.role === "owner")}>
                  {getManagementRoleLabel(session.role as "owner" | "staff" | "barber" | "platform_admin")}
                </span>
                <span className="status-pill">{session.email}</span>
              </div>
            </div>
          </div>

          {error ? <div className="notice error">{error}</div> : null}
          {notice ? <div className="notice">{notice}</div> : null}
        </header>

        {children}
      </section>
    </main>
  );
}

export { Link, formatCurrency, formatHour };
