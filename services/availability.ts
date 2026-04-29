import { addDays } from "date-fns";
import { formatInTimeZone } from "date-fns-tz";

import { listAppointmentsForBarbersInRange, listFutureAppointmentsForBarber } from "@/repositories/appointments";
import {
  listBarbersForService,
  listWorkingHours,
  listWorkingHoursForBarbers
} from "@/repositories/barbers";
import { getServiceById } from "@/repositories/services";
import {
  addMinutes,
  buildZonedDate,
  clampToFuture,
  dateKeyInTimeZone,
  formatHour,
  laterThan,
  nextDay,
  nowInTimeZone,
  weekdayFromDateKey
} from "@/lib/time";

export interface PublicAvailabilitySlot {
  start: string;
  end: string;
  barberId: string;
  barberName: string;
}

export interface AvailabilityOption extends PublicAvailabilitySlot {
  barberRating: number;
  label: string;
  score: number;
}

type WorkingHourRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type WorkingHourByBarberRow = WorkingHourRow & {
  barber_id: string;
};

const SLOT_STEP_MINUTES = 15;

function findWorkingWindow(hours: WorkingHourRow[], dayOfWeek: number) {
  return hours.find((item) => item.day_of_week === dayOfWeek);
}

function roundUpToStep(date: Date, stepMinutes: number) {
  const rounded = new Date(date.getTime());
  rounded.setUTCSeconds(0, 0);

  const minutes = rounded.getUTCMinutes();
  const remainder = minutes % stepMinutes;
  if (remainder === 0 && rounded.getTime() >= date.getTime()) {
    return rounded;
  }

  rounded.setUTCMinutes(minutes + (remainder === 0 ? stepMinutes : stepMinutes - remainder));
  return rounded;
}

function isStepAligned(date: Date, stepMinutes: number) {
  return date.getUTCSeconds() === 0
    && date.getUTCMilliseconds() === 0
    && date.getUTCMinutes() % stepMinutes === 0;
}

function formatSlotDate(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm:ssXXX");
}

function buildDayRange(date: string, timezone: string) {
  const dayStart = buildZonedDate(date, "00:00", timezone);
  const nextDate = formatInTimeZone(nextDay(dayStart), timezone, "yyyy-MM-dd");
  const dayEnd = buildZonedDate(nextDate, "00:00", timezone);

  return { dayStart, dayEnd };
}

function overlapsExistingAppointments(
  start: Date,
  end: Date,
  appointments: { datetime_start: string; datetime_end: string }[]
) {
  return appointments.some((appointment) => {
    const appointmentStart = new Date(appointment.datetime_start);
    const appointmentEnd = new Date(appointment.datetime_end);
    return end > appointmentStart && start < appointmentEnd;
  });
}

async function findEarliestForBarber(
  tenant: { tenantId: string; timezone: string },
  barber: { id: string; full_name: string; rating: string },
  durationMinutes: number,
  searchStart: Date
): Promise<AvailabilityOption | null> {
  const workingHours = await listWorkingHours(tenant.tenantId, barber.id);
  if (workingHours.length === 0) {
    return null;
  }

  let cursor = clampToFuture(searchStart, tenant.timezone);

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const currentDay = addDays(cursor, dayOffset);
    const dateKey = dateKeyInTimeZone(currentDay, tenant.timezone);
    const workingWindow = findWorkingWindow(
      workingHours,
      weekdayFromDateKey(dateKey, tenant.timezone)
    );

    if (!workingWindow) {
      continue;
    }

    const windowStart = buildZonedDate(dateKey, workingWindow.start_time.slice(0, 5), tenant.timezone);
    const windowEnd = buildZonedDate(dateKey, workingWindow.end_time.slice(0, 5), tenant.timezone);
    let candidate = roundUpToStep(laterThan(cursor, windowStart), SLOT_STEP_MINUTES);

    if (candidate >= windowEnd) {
      continue;
    }

    const appointments = await listFutureAppointmentsForBarber(
      tenant.tenantId,
      barber.id,
      windowStart,
      windowEnd
    );

    for (const appointment of appointments) {
      const appointmentStart = new Date(appointment.datetime_start);
      const appointmentEnd = new Date(appointment.datetime_end);
      const candidateEnd = addMinutes(candidate, durationMinutes);

      if (candidateEnd <= appointmentStart) {
        return {
          barberId: barber.id,
          barberName: barber.full_name,
          barberRating: Number(barber.rating),
          start: candidate.toISOString(),
          end: candidateEnd.toISOString(),
          label: formatHour(candidate, tenant.timezone),
          score: candidate.getTime() - Number(barber.rating) * 60_000
        };
      }

      if (candidate < appointmentEnd) {
        candidate = roundUpToStep(appointmentEnd, SLOT_STEP_MINUTES);
      }
    }

    const candidateEnd = addMinutes(candidate, durationMinutes);
    if (candidateEnd <= windowEnd) {
      return {
        barberId: barber.id,
        barberName: barber.full_name,
        barberRating: Number(barber.rating),
        start: candidate.toISOString(),
        end: candidateEnd.toISOString(),
        label: formatHour(candidate, tenant.timezone),
        score: candidate.getTime() - Number(barber.rating) * 60_000
      };
    }

    cursor = nextDay(windowStart);
  }

  return null;
}

export async function getAvailableSlotsByDate(input: {
  tenantId: string;
  timezone: string;
  serviceId: string;
  date: string;
  barberId?: string | null;
}) {
  const service = await getServiceById(input.tenantId, input.serviceId);
  if (!service) {
    throw new Error("Servicio no encontrado.");
  }

  let barbers = await listBarbersForService(input.tenantId, input.serviceId);
  if (input.barberId) {
    barbers = barbers.filter((barber) => barber.id === input.barberId);
  }

  if (barbers.length === 0) {
    return {
      date: input.date,
      serviceId: input.serviceId,
      slots: [] as PublicAvailabilitySlot[]
    };
  }

  const dayOfWeek = weekdayFromDateKey(input.date, input.timezone);
  const barberIds = barbers.map((barber) => barber.id);
  const { dayStart, dayEnd } = buildDayRange(input.date, input.timezone);
  const [workingHours, appointments] = await Promise.all([
    listWorkingHoursForBarbers(input.tenantId, barberIds),
    listAppointmentsForBarbersInRange(input.tenantId, barberIds, dayStart, dayEnd)
  ]);

  const hoursByBarber = new Map<string, WorkingHourByBarberRow[]>();
  for (const row of workingHours) {
    const current = hoursByBarber.get(row.barber_id) ?? [];
    current.push(row);
    hoursByBarber.set(row.barber_id, current);
  }

  const appointmentsByBarber = new Map<string, { datetime_start: string; datetime_end: string }[]>();
  for (const appointment of appointments) {
    const current = appointmentsByBarber.get(appointment.barber_id) ?? [];
    current.push({
      datetime_start: appointment.datetime_start,
      datetime_end: appointment.datetime_end
    });
    appointmentsByBarber.set(appointment.barber_id, current);
  }

  const now = new Date();
  const isToday = dateKeyInTimeZone(now, input.timezone) === input.date;
  const slots: PublicAvailabilitySlot[] = [];

  for (const barber of barbers) {
    const workingWindow = findWorkingWindow(hoursByBarber.get(barber.id) ?? [], dayOfWeek);
    if (!workingWindow) {
      continue;
    }

    const windowStart = buildZonedDate(input.date, workingWindow.start_time.slice(0, 5), input.timezone);
    const windowEnd = buildZonedDate(input.date, workingWindow.end_time.slice(0, 5), input.timezone);
    const appointmentsForBarber = appointmentsByBarber.get(barber.id) ?? [];
    let cursor = isToday ? roundUpToStep(laterThan(now, windowStart), SLOT_STEP_MINUTES) : windowStart;

    while (cursor < windowEnd) {
      const candidateEnd = addMinutes(cursor, service.duration_minutes);
      if (!overlapsExistingAppointments(cursor, candidateEnd, appointmentsForBarber) && candidateEnd <= windowEnd) {
        slots.push({
          start: formatSlotDate(cursor, input.timezone),
          end: formatSlotDate(candidateEnd, input.timezone),
          barberId: barber.id,
          barberName: barber.full_name
        });
      }

      cursor = addMinutes(cursor, SLOT_STEP_MINUTES);
    }
  }

  slots.sort((a, b) => a.start.localeCompare(b.start) || a.barberName.localeCompare(b.barberName));

  return {
    date: input.date,
    serviceId: input.serviceId,
    slots
  };
}

export async function assertBookableAppointmentSlot(input: {
  tenantId: string;
  timezone: string;
  barberId: string;
  serviceDurationMinutes: number;
  scheduledAt: Date;
}) {
  if (Number.isNaN(input.scheduledAt.getTime())) {
    throw new Error("Horario inválido.");
  }

  if (!isStepAligned(input.scheduledAt, SLOT_STEP_MINUTES)) {
    throw new Error("El horario debe coincidir con un slot válido.");
  }

  if (input.scheduledAt < new Date()) {
    throw new Error("No se pueden reservar horarios pasados.");
  }

  const dateKey = dateKeyInTimeZone(input.scheduledAt, input.timezone);
  const [workingHours, appointments] = await Promise.all([
    listWorkingHours(input.tenantId, input.barberId),
    listAppointmentsForBarbersInRange(
      input.tenantId,
      [input.barberId],
      input.scheduledAt,
      addMinutes(input.scheduledAt, input.serviceDurationMinutes)
    )
  ]);

  const workingWindow = findWorkingWindow(
    workingHours,
    weekdayFromDateKey(dateKey, input.timezone)
  );

  if (!workingWindow) {
    throw new Error("El barbero no trabaja en ese día.");
  }

  const windowStart = buildZonedDate(dateKey, workingWindow.start_time.slice(0, 5), input.timezone);
  const windowEnd = buildZonedDate(dateKey, workingWindow.end_time.slice(0, 5), input.timezone);
  const datetimeEnd = addMinutes(input.scheduledAt, input.serviceDurationMinutes);

  if (input.scheduledAt < windowStart || datetimeEnd > windowEnd) {
    throw new Error("El horario seleccionado queda fuera del horario laboral.");
  }

  if (dateKeyInTimeZone(datetimeEnd, input.timezone) !== dateKey && datetimeEnd.getTime() !== windowEnd.getTime()) {
    throw new Error("El horario seleccionado no entra completo en el día solicitado.");
  }

  const barberAppointments = appointments.map((appointment) => ({
    datetime_start: appointment.datetime_start,
    datetime_end: appointment.datetime_end
  }));

  if (overlapsExistingAppointments(input.scheduledAt, datetimeEnd, barberAppointments)) {
    throw new Error("Este horario ya no está disponible.");
  }

  return {
    datetimeEnd,
    date: dateKey
  };
}

export async function listAvailabilityOptions(
  tenant: { tenantId: string; timezone: string },
  serviceId: string,
  preferredBarberId?: string | null
) {
  const service = await getServiceById(tenant.tenantId, serviceId);
  if (!service) {
    throw new Error("Servicio no encontrado.");
  }

  let barbers = await listBarbersForService(tenant.tenantId, serviceId);
  if (preferredBarberId) {
    barbers = barbers.filter((barber) => barber.id === preferredBarberId);
  }

  const searchStart = nowInTimeZone(tenant.timezone);
  const options = (
    await Promise.all(
      barbers.map((barber) =>
        findEarliestForBarber(tenant, barber, service.duration_minutes, searchStart)
      )
    )
  )
    .filter((item): item is AvailabilityOption => Boolean(item))
    .sort((a, b) => a.score - b.score || a.start.localeCompare(b.start))
    .slice(0, 6);

  return {
    service,
    options
  };
}

export async function findBestImmediateAssignment(
  tenant: { tenantId: string; timezone: string },
  serviceId: string
) {
  const result = await listAvailabilityOptions(tenant, serviceId);
  return result.options[0] ?? null;
}

export async function findBestImmediateQueueSlot(
  tenant: { tenantId: string; timezone: string },
  serviceId: string,
  preferredBarberId?: string | null,
  maxWaitMinutes = 90
) {
  const result = await listAvailabilityOptions(tenant, serviceId, preferredBarberId);
  const maxStart = Date.now() + maxWaitMinutes * 60_000;

  return result.options.find((option) => new Date(option.start).getTime() <= maxStart) ?? null;
}
