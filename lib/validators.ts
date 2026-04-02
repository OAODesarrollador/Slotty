import { z } from "zod";

function isValidDateKey(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export const dateKeySchema = z.string().refine(isValidDateKey, {
  message: "date debe usar formato YYYY-MM-DD."
});

export const appointmentPayloadSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  scheduledAt: z.string().datetime({ offset: true }),
  customer: z.object({
    name: z.string().trim().min(2),
    phone: z.string().trim().min(6)
  }),
  notes: z.string().trim().max(500).optional().or(z.literal(""))
});

export const availabilityQuerySchema = z.object({
  serviceId: z.string().uuid(),
  date: dateKeySchema,
  barberId: z.string().uuid().optional()
});

export const queuePayloadSchema = z.object({
  serviceId: z.string().uuid(),
  customer: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional().or(z.literal(""))
  })
});
