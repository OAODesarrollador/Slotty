import { z } from "zod";

export const appointmentPayloadSchema = z.object({
  barberId: z.string().uuid(),
  serviceId: z.string().uuid(),
  datetimeStart: z.string().datetime(),
  paymentMethod: z.enum(["pay_at_store", "bank_transfer", "mercado_pago"]),
  customer: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal(""))
  })
});

export const queuePayloadSchema = z.object({
  serviceId: z.string().uuid(),
  customer: z.object({
    fullName: z.string().min(2),
    phone: z.string().min(6),
    email: z.string().email().optional().or(z.literal(""))
  })
});
