import { addDays, format, isBefore, max, startOfDay } from "date-fns";
import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export function nowInTimeZone(timezone: string) {
  return toZonedTime(new Date(), timezone);
}

export function formatCurrency(value: number | string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0
  }).format(Number(value));
}

export function formatDateTime(date: Date | string, timezone: string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(value, timezone, "dd/MM/yyyy HH:mm");
}

export function formatHour(date: Date | string, timezone: string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return formatInTimeZone(value, timezone, "HH:mm");
}

export function dateKeyInTimeZone(date: Date, timezone: string) {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd");
}

export function buildZonedDate(dateKey: string, time: string, timezone: string) {
  return fromZonedTime(`${dateKey}T${time}:00`, timezone);
}

export function nextDay(date: Date) {
  return addDays(date, 1);
}

export function clampToFuture(cursor: Date, timezone: string) {
  return max([cursor, nowInTimeZone(timezone)]);
}

export function zonedDateStart(date: Date, timezone: string) {
  return startOfDay(toZonedTime(date, timezone));
}

export function laterThan(a: Date, b: Date) {
  return isBefore(a, b) ? b : a;
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60_000);
}

export function weekdayFromDateKey(dateKey: string, timezone: string) {
  const zoned = toZonedTime(fromZonedTime(`${dateKey}T12:00:00`, timezone), timezone);
  return Number(format(zoned, "i")) % 7;
}
