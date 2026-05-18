import type { PlatformRole } from "@/lib/platform-auth";
import type { TenantBillingStatus, TenantPlatformPlan, TenantPlatformStatus } from "@/repositories/platform";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function readString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

export function readOptionalString(formData: FormData, name: string) {
  const value = readString(formData, name);
  return value || null;
}

export function readBoolean(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

export function assertSecurePassword(password: string) {
  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z\d]/.test(password)) {
    throw new Error("La contraseña debe incluir mayúscula, minúscula, número y símbolo.");
  }
}

export function assertSlug(slug: string) {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error("El slug solo puede usar minúsculas, números y guiones intermedios.");
  }
}

export function readTenantStatus(value: string): TenantPlatformStatus {
  if (value === "trial" || value === "active" || value === "suspended" || value === "cancelled") {
    return value;
  }
  return "active";
}

export function readTenantPlan(value: string): TenantPlatformPlan {
  if (value === "starter" || value === "pro" || value === "enterprise") {
    return value;
  }
  return "starter";
}

export function readBillingStatus(value: string): TenantBillingStatus {
  if (value === "ok" || value === "pending" || value === "overdue") {
    return value;
  }
  return "ok";
}

export function readPlatformRole(value: string): PlatformRole {
  if (value === "platform_admin" || value === "platform_support" || value === "platform_readonly") {
    return value;
  }
  return "platform_readonly";
}
