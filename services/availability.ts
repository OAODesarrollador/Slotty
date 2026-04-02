import { addDays } from "date-fns";

import { listFutureAppointmentsForBarber } from "@/repositories/appointments";
import { listBarbersForService, listWorkingHours } from "@/repositories/barbers";
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

export interface AvailabilityOption {
  barberId: string;
  barberName: string;
  barberRating: number;
  start: string;
  end: string;
  label: string;
  score: number;
}

type WorkingHourRow = {
  day_of_week: number;
  start_time: string;
  end_time: string;
};

function findWorkingWindow(hours: WorkingHourRow[], dayOfWeek: number) {
  return hours.find((item) => item.day_of_week === dayOfWeek);
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
    let candidate = laterThan(cursor, windowStart);

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
        candidate = appointmentEnd;
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
