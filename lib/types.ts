export type AppointmentStatus =
  | "pending_payment"
  | "pending_verification"
  | "scheduled"
  | "confirmed"
  | "checked_in"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show"
  | "expired";

export type PaymentMethod = "pay_at_store" | "bank_transfer" | "mercado_pago";
export type PaymentStatus =
  | "pending"
  | "pending_verification"
  | "approved"
  | "rejected"
  | "expired"
  | "cancelled"
  | "refunded";

export type QueueStatus =
  | "waiting"
  | "called"
  | "in_progress"
  | "done"
  | "no_show"
  | "cancelled";

export interface TenantContext {
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  timezone: string;
}

export interface SessionUser {
  userId: string;
  tenantId: string;
  tenantSlug: string;
  role: "owner" | "staff" | "barber" | "platform_admin";
  email: string;
  displayName: string;
}
