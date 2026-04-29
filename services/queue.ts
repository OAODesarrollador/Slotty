import { addDays } from "date-fns";
import type { PoolClient } from "pg";

import { withTransaction, advisoryTenantLock } from "@/lib/db";
import { addMinutes, buildZonedDate, clampToFuture, dateKeyInTimeZone, laterThan, nextDay, nowInTimeZone, weekdayFromDateKey } from "@/lib/time";
import type { QueueStatus } from "@/lib/types";
import { getBarberForService, listBarbersForService, listWorkingHours } from "@/repositories/barbers";
import { listFutureAppointmentsForBarber, updateAppointmentStatus, upsertCustomer } from "@/repositories/appointments";
import {
  assignQueueEntryToAppointment,
  cancelExpiredWaitingEntries,
  clearQueueEntryPositioning,
  getQueueEntryByIdForUpdate,
  insertQueueEntry,
  listWaitingQueueEntries,
  updateQueueEntryPositionAndEta,
  updateQueueEntryStatus
} from "@/repositories/queue";
import { getServiceById } from "@/repositories/services";
import { getTenantBookingSettings } from "@/repositories/tenants";
import { findBestImmediateQueueSlot, getAvailableSlotsByDate } from "@/services/availability";
import { createAppointmentWithClient } from "@/services/booking";

const QUEUE_LOCK_SCOPE = "queue";
const QUEUE_WAITING_EXPIRATION_MINUTES = 180;
const QUEUE_ASSIGNMENT_WINDOW_MINUTES = 90;

type TenantInput = {
  tenantId: string;
  tenantSlug?: string;
  timezone: string;
};

type WorkingHourRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type AppointmentBlock = {
  datetime_start: string | Date;
  datetime_end: string | Date;
};

export type QueueJoinEligibility = {
  eligible: boolean;
  code: "ok" | "no_barbers" | "outside_working_hours" | "near_closing" | "no_slots";
  message: string;
};

async function lockQueueScope(client: PoolClient, tenantId: string) {
  await client.query(
    "SELECT pg_advisory_xact_lock(hashtext($1), hashtext($2))",
    [tenantId, QUEUE_LOCK_SCOPE]
  );
}

function findWorkingWindow(hours: WorkingHourRow[], dayOfWeek: number) {
  return hours.find((item) => item.day_of_week === dayOfWeek);
}

function overlapsExistingAppointments(
  start: Date,
  end: Date,
  appointments: AppointmentBlock[]
) {
  return appointments.some((appointment) => {
    const appointmentStart = new Date(appointment.datetime_start);
    const appointmentEnd = new Date(appointment.datetime_end);
    return end > appointmentStart && start < appointmentEnd;
  });
}

function toTime(value: string | Date) {
  return value instanceof Date ? value.getTime() : new Date(value).getTime();
}

async function findEarliestStartForBarber(input: {
  tenant: TenantInput;
  barberId: string;
  durationMinutes: number;
  searchStart: Date;
  appointments: AppointmentBlock[];
}) {
  const workingHours = await listWorkingHours(input.tenant.tenantId, input.barberId);
  if (workingHours.length === 0) {
    return null;
  }

  let cursor = clampToFuture(input.searchStart, input.tenant.timezone);

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const currentDay = addDays(cursor, dayOffset);
    const dateKey = dateKeyInTimeZone(currentDay, input.tenant.timezone);
    const workingWindow = findWorkingWindow(
      workingHours,
      weekdayFromDateKey(dateKey, input.tenant.timezone)
    );

    if (!workingWindow) {
      continue;
    }

    const windowStart = buildZonedDate(dateKey, workingWindow.start_time.slice(0, 5), input.tenant.timezone);
    const windowEnd = buildZonedDate(dateKey, workingWindow.end_time.slice(0, 5), input.tenant.timezone);
    let candidate = laterThan(cursor, windowStart);

    while (candidate < windowEnd) {
      const candidateEnd = addMinutes(candidate, input.durationMinutes);
      if (candidateEnd > windowEnd) {
        break;
      }

      if (!overlapsExistingAppointments(candidate, candidateEnd, input.appointments)) {
        return candidate;
      }

      const blockingAppointments = input.appointments
        .filter((appointment) => {
          const appointmentStart = new Date(appointment.datetime_start);
          const appointmentEnd = new Date(appointment.datetime_end);
          return candidateEnd > appointmentStart && candidate < appointmentEnd;
        })
        .sort((a, b) => toTime(a.datetime_start) - toTime(b.datetime_start));

      const nextAppointment = blockingAppointments[0];
      if (!nextAppointment) {
        break;
      }

      candidate = new Date(nextAppointment.datetime_end);
    }

    cursor = nextDay(windowStart);
  }

  return null;
}

async function getSimulatedEstimate(input: {
  tenant: TenantInput;
  serviceId: string;
  preferredBarberId?: string | null;
  durationMinutes: number;
  simulatedAppointmentsByBarber: Map<string, AppointmentBlock[]>;
}) {
  let barbers = await listBarbersForService(input.tenant.tenantId, input.serviceId);
  if (input.preferredBarberId) {
    const preferred = await getBarberForService(input.tenant.tenantId, input.serviceId, input.preferredBarberId);
    barbers = preferred ? [preferred] : [];
  }

  if (barbers.length === 0) {
    return null;
  }

  const candidates = await Promise.all(
    barbers.map(async (barber) => {
      if (!input.simulatedAppointmentsByBarber.has(barber.id)) {
        const appointments = await listFutureAppointmentsForBarber(
          input.tenant.tenantId,
          barber.id,
          new Date(),
          addDays(new Date(), 14)
        );
        input.simulatedAppointmentsByBarber.set(
          barber.id,
          appointments.map((appointment) => ({
            datetime_start: appointment.datetime_start,
            datetime_end: appointment.datetime_end
          }))
        );
      }

      const appointments = input.simulatedAppointmentsByBarber.get(barber.id) ?? [];
      const start = await findEarliestStartForBarber({
        tenant: input.tenant,
        barberId: barber.id,
        durationMinutes: input.durationMinutes,
        searchStart: nowInTimeZone(input.tenant.timezone),
        appointments
      });

      if (!start) {
        return null;
      }

      return {
        barberId: barber.id,
        barberName: barber.full_name,
        rating: Number(barber.rating),
        start
      };
    })
  );

  return candidates
    .filter((candidate): candidate is NonNullable<typeof candidate> => Boolean(candidate))
    .sort((a, b) => (
      a.start.getTime() - b.start.getTime()
      || b.rating - a.rating
      || a.barberName.localeCompare(b.barberName)
    ))[0] ?? null;
}

function appendSimulatedAppointment(
  simulatedAppointmentsByBarber: Map<string, AppointmentBlock[]>,
  barberId: string,
  start: Date,
  durationMinutes: number
) {
  const current = simulatedAppointmentsByBarber.get(barberId) ?? [];
  current.push({
    datetime_start: start.toISOString(),
    datetime_end: addMinutes(start, durationMinutes).toISOString()
  });
  current.sort((a, b) => toTime(a.datetime_start) - toTime(b.datetime_start));
  simulatedAppointmentsByBarber.set(barberId, current);
}

export async function getQueueJoinEligibility(input: {
  tenant: TenantInput;
  serviceId: string;
  preferredBarberId?: string | null;
  serviceDurationMinutes: number;
}): Promise<QueueJoinEligibility> {
  let barbers = await listBarbersForService(input.tenant.tenantId, input.serviceId);
  if (input.preferredBarberId) {
    const preferred = await getBarberForService(
      input.tenant.tenantId,
      input.serviceId,
      input.preferredBarberId
    );
    barbers = preferred ? [preferred] : [];
  }

  if (barbers.length === 0) {
    return {
      eligible: false,
      code: "no_barbers",
      message: "No hay profesionales disponibles para este servicio."
    };
  }

  const now = nowInTimeZone(input.tenant.timezone);
  const today = dateKeyInTimeZone(now, input.tenant.timezone);
  const dayOfWeek = weekdayFromDateKey(today, input.tenant.timezone);
  let hasRemainingWorkingWindow = false;
  let hasEnoughTimeForServiceToday = false;

  for (const barber of barbers) {
    const workingHours = await listWorkingHours(input.tenant.tenantId, barber.id);
    const workingWindow = findWorkingWindow(workingHours, dayOfWeek);
    if (!workingWindow) {
      continue;
    }

    const windowStart = buildZonedDate(today, workingWindow.start_time.slice(0, 5), input.tenant.timezone);
    const windowEnd = buildZonedDate(today, workingWindow.end_time.slice(0, 5), input.tenant.timezone);
    const earliestStart = laterThan(now, windowStart);

    if (earliestStart < windowEnd) {
      hasRemainingWorkingWindow = true;
    }

    if (addMinutes(earliestStart, input.serviceDurationMinutes) <= windowEnd) {
      hasEnoughTimeForServiceToday = true;
      break;
    }
  }

  if (!hasRemainingWorkingWindow) {
    return {
      eligible: false,
      code: "outside_working_hours",
      message: "La fila virtual ya no recibe ingresos porque la jornada de hoy terminó."
    };
  }

  if (!hasEnoughTimeForServiceToday) {
    return {
      eligible: false,
      code: "near_closing",
      message: "Ya estamos cerca del cierre y este servicio no entra en la jornada de hoy."
    };
  }

  const availability = await getAvailableSlotsByDate({
    tenantId: input.tenant.tenantId,
    timezone: input.tenant.timezone,
    serviceId: input.serviceId,
    date: today,
    barberId: input.preferredBarberId ?? undefined
  });

  if (availability.slots.length === 0) {
    return {
      eligible: false,
      code: "no_slots",
      message: "No hay turnos disponibles hoy para sumarte a la fila virtual."
    };
  }

  return {
    eligible: true,
    code: "ok",
    message: ""
  };
}

async function assertQueueJoinAvailability(input: {
  tenant: TenantInput;
  serviceId: string;
  preferredBarberId?: string | null;
  serviceDurationMinutes: number;
}) {
  const eligibility = await getQueueJoinEligibility(input);
  if (!eligibility.eligible) {
    throw new Error(eligibility.message);
  }
}

async function refreshQueueForTenant(tenant: TenantInput, includeAssignment: boolean) {
  await recalculateQueue(tenant);
  if (includeAssignment) {
    await tryAssignWaitingEntries(tenant);
    await recalculateQueue(tenant);
  }
}

export async function enqueueQueueEntry(input: {
  tenant: TenantInput;
  serviceId: string;
  barberId?: string | null;
  customer: { fullName: string; phone: string; email?: string | null };
}) {
  const service = await getServiceById(input.tenant.tenantId, input.serviceId);
  if (!service) {
    throw new Error("Servicio no encontrado.");
  }

  await assertQueueJoinAvailability({
    tenant: input.tenant,
    serviceId: input.serviceId,
    preferredBarberId: input.barberId ?? null,
    serviceDurationMinutes: service.duration_minutes
  });

  const queueEntry = await withTransaction(async (client) => {
    await lockQueueScope(client, input.tenant.tenantId);

    const customer = await upsertCustomer(client, input.tenant.tenantId, {
      fullName: input.customer.fullName,
      phone: input.customer.phone,
      email: input.customer.email ?? null
    });

    return insertQueueEntry(client, {
      tenantId: input.tenant.tenantId,
      customerId: customer.id,
      serviceId: input.serviceId,
      barberId: input.barberId ?? null
    });
  });

  await refreshQueueForTenant(input.tenant, true);

  return queueEntry;
}

export async function recalculateQueue(tenant: TenantInput) {
  return withTransaction(async (client) => {
    await lockQueueScope(client, tenant.tenantId);
    await cancelExpiredWaitingEntries(client, tenant.tenantId, QUEUE_WAITING_EXPIRATION_MINUTES);

    const waitingEntries = await listWaitingQueueEntries(client, tenant.tenantId);
    await clearQueueEntryPositioning(client, tenant.tenantId);

    const simulatedAppointmentsByBarber = new Map<string, AppointmentBlock[]>();

    const barberIds = Array.from(
      new Set(
        waitingEntries
          .map((entry) => entry.barber_id)
          .filter((value): value is string => Boolean(value))
      )
    );

    for (const barberId of barberIds) {
      const appointments = await listFutureAppointmentsForBarber(
        tenant.tenantId,
        barberId,
        new Date(),
        addDays(new Date(), 14)
      );
      simulatedAppointmentsByBarber.set(
        barberId,
        appointments.map((appointment) => ({
          datetime_start: appointment.datetime_start,
          datetime_end: appointment.datetime_end
        }))
      );
    }

    let position = 1;
    for (const entry of waitingEntries) {
      const estimate = await getSimulatedEstimate({
        tenant,
        serviceId: entry.service_id,
        preferredBarberId: entry.barber_id,
        durationMinutes: entry.service_duration_minutes,
        simulatedAppointmentsByBarber
      });

      await updateQueueEntryPositionAndEta(client, {
        tenantId: tenant.tenantId,
        queueEntryId: entry.id,
        position,
        estimatedTime: estimate?.start ?? null
      });

      if (estimate) {
        appendSimulatedAppointment(
          simulatedAppointmentsByBarber,
          estimate.barberId,
          estimate.start,
          entry.service_duration_minutes
        );
      }

      position += 1;
    }

    return { updated: waitingEntries.length };
  });
}

export async function assignQueueToSlot(input: {
  tenant: TenantInput;
  queueEntryId: string;
}) {
  return withTransaction(async (client) => {
    await lockQueueScope(client, input.tenant.tenantId);

    const entry = await getQueueEntryByIdForUpdate(client, input.tenant.tenantId, input.queueEntryId);
    if (!entry || entry.status !== "waiting" || entry.assigned_appointment_id) {
      return { assigned: false };
    }

    const slot = await findBestImmediateQueueSlot(
      input.tenant,
      entry.service_id,
      entry.barber_id,
      QUEUE_ASSIGNMENT_WINDOW_MINUTES
    );

    if (!slot) {
      return { assigned: false };
    }

    await advisoryTenantLock(client, input.tenant.tenantId, slot.barberId);

    const entryAfterBarberLock = await getQueueEntryByIdForUpdate(client, input.tenant.tenantId, input.queueEntryId);
    if (!entryAfterBarberLock || entryAfterBarberLock.status !== "waiting" || entryAfterBarberLock.assigned_appointment_id) {
      return { assigned: false };
    }

    const [service, tenantSettings] = await Promise.all([
      getServiceById(input.tenant.tenantId, entryAfterBarberLock.service_id),
      getTenantBookingSettings(input.tenant.tenantId)
    ]);

    if (!service || !tenantSettings) {
      throw new Error("No se pudo resolver la configuracion de la cola.");
    }

    try {
      const appointment = await createAppointmentWithClient(
        client,
        {
          tenantId: input.tenant.tenantId,
          barberId: slot.barberId,
          serviceId: entryAfterBarberLock.service_id,
          datetimeStart: new Date(slot.start),
          paymentMethod: "pay_at_store",
          customer: {
            fullName: entryAfterBarberLock.customer_name,
            phone: entryAfterBarberLock.customer_phone,
            email: entryAfterBarberLock.customer_email
          },
          source: "walk_in"
        },
        {
          service,
          tenant: {
            name: tenantSettings.name,
            slug: tenantSettings.slug,
            requires_deposit: tenantSettings.requires_deposit,
            deposit_type: tenantSettings.deposit_type,
            deposit_value: tenantSettings.deposit_value,
            timezone: tenantSettings.timezone
          }
        }
      );

      await assignQueueEntryToAppointment(client, {
        tenantId: input.tenant.tenantId,
        queueEntryId: entryAfterBarberLock.id,
        appointmentId: appointment.appointmentId,
        barberId: slot.barberId,
        estimatedTime: new Date(slot.start)
      });

      return {
        assigned: true,
        queueEntryId: entryAfterBarberLock.id,
        appointmentId: appointment.appointmentId
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo asignar la fila.";
      const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";

      if (message === "Este horario ya no está disponible." || code === "23P01") {
        return { assigned: false };
      }

      throw error;
    }
  });
}

export async function tryAssignWaitingEntries(tenant: TenantInput) {
  let assignedCount = 0;

  while (true) {
    const waitingEntries = await withTransaction(async (client) => {
      await lockQueueScope(client, tenant.tenantId);
      await cancelExpiredWaitingEntries(client, tenant.tenantId, QUEUE_WAITING_EXPIRATION_MINUTES);
      return listWaitingQueueEntries(client, tenant.tenantId);
    });

    if (waitingEntries.length === 0) {
      break;
    }

    let assignedThisPass = false;

    for (const entry of waitingEntries) {
      const result = await assignQueueToSlot({
        tenant,
        queueEntryId: entry.id
      });

      if (result.assigned) {
        assignedCount += 1;
        assignedThisPass = true;
        await recalculateQueue(tenant);
        break;
      }
    }

    if (!assignedThisPass) {
      break;
    }
  }

  return { assigned: assignedCount };
}

async function updateQueueLifecycleStatus(input: {
  tenant: TenantInput;
  queueEntryId: string;
  nextStatus: QueueStatus;
  appointmentStatus?: "in_progress" | "completed" | "no_show" | "cancelled";
  shouldRefreshQueue?: boolean;
}) {
  await withTransaction(async (client) => {
    await lockQueueScope(client, input.tenant.tenantId);

    const entry = await getQueueEntryByIdForUpdate(client, input.tenant.tenantId, input.queueEntryId);
    if (!entry) {
      throw new Error("Entrada de fila no encontrada.");
    }

    const allowedTransitions: Partial<Record<QueueStatus, QueueStatus[]>> = {
      waiting: ["cancelled"],
      called: ["in_progress", "no_show", "cancelled"],
      in_progress: ["done"]
    };

    const allowed = allowedTransitions[entry.status] ?? [];
    if (!allowed.includes(input.nextStatus)) {
      throw new Error("La transicion de estado no es valida para esta entrada.");
    }

    await updateQueueEntryStatus(client, {
      tenantId: input.tenant.tenantId,
      queueEntryId: input.queueEntryId,
      status: input.nextStatus
    });

    if (entry.assigned_appointment_id && input.appointmentStatus) {
      await updateAppointmentStatus(client, {
        tenantId: input.tenant.tenantId,
        appointmentId: entry.assigned_appointment_id,
        status: input.appointmentStatus
      });
    }
  });

  if (input.shouldRefreshQueue) {
    await refreshQueueForTenant(input.tenant, true);
  }
}

export async function markQueueEntryInProgress(tenant: TenantInput, queueEntryId: string) {
  await updateQueueLifecycleStatus({
    tenant,
    queueEntryId,
    nextStatus: "in_progress",
    appointmentStatus: "in_progress"
  });
}

export async function markQueueEntryDone(tenant: TenantInput, queueEntryId: string) {
  await updateQueueLifecycleStatus({
    tenant,
    queueEntryId,
    nextStatus: "done",
    appointmentStatus: "completed"
  });
}

export async function markQueueEntryNoShow(tenant: TenantInput, queueEntryId: string) {
  await updateQueueLifecycleStatus({
    tenant,
    queueEntryId,
    nextStatus: "no_show",
    appointmentStatus: "no_show",
    shouldRefreshQueue: true
  });
}

export async function cancelQueueEntry(tenant: TenantInput, queueEntryId: string) {
  await updateQueueLifecycleStatus({
    tenant,
    queueEntryId,
    nextStatus: "cancelled",
    appointmentStatus: "cancelled",
    shouldRefreshQueue: true
  });
}
