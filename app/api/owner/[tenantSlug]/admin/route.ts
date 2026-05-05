import crypto from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { canManageCompany, canManageUsers } from "@/lib/admin";
import { hashPassword, requireSessionForTenantRole } from "@/lib/auth";
import { requireTenantBySlug } from "@/lib/tenant";
import { tenantPathForHost } from "@/lib/tenant-domain";
import type { AppointmentStatus, PaymentMethod } from "@/lib/types";
import { updateAppointmentStatusForOwner } from "@/repositories/appointments";
import {
  archiveBarber,
  createBarber,
  replaceBarberServices,
  replaceBarberWorkingHours,
  updateBarber
} from "@/repositories/barbers";
import { archiveService, createService, updateService } from "@/repositories/services";
import { updateTenantAdminSettings } from "@/repositories/tenants";
import { createTenantUser, deactivateTenantUser, updateTenantUser } from "@/repositories/users";
import { createManualAppointmentForAdmin } from "@/services/booking";

function redirectTo(
  request: NextRequest,
  tenantSlug: string,
  section: string,
  message?: string,
  isError = false,
  extraParams?: Record<string, string>
) {
  const pathnameBySection: Record<string, string> = {
    overview: tenantPathForHost(request.headers.get("host"), tenantSlug, "/owner/dashboard"),
    appointments: tenantPathForHost(request.headers.get("host"), tenantSlug, "/owner/dashboard/turnos"),
    services: tenantPathForHost(request.headers.get("host"), tenantSlug, "/owner/dashboard/servicios"),
    company: tenantPathForHost(request.headers.get("host"), tenantSlug, "/owner/dashboard/empresa"),
    analytics: tenantPathForHost(request.headers.get("host"), tenantSlug, "/owner/dashboard/analisis")
  };

  const url = new URL(pathnameBySection[section] ?? pathnameBySection.overview, request.url);
  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) {
        url.searchParams.set(key, value);
      }
    }
  }
  if (message) {
    url.searchParams.set(isError ? "error" : "notice", message);
  }
  return NextResponse.redirect(url, 303);
}

function readBoolean(formData: FormData, name: string) {
  return formData.get(name) === "on" || formData.get(name) === "true";
}

function readNumber(formData: FormData, name: string, fallback = 0) {
  const raw = String(formData.get(name) ?? "");
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readString(formData: FormData, name: string) {
  return String(formData.get(name) ?? "").trim();
}

function readOptionalString(formData: FormData, name: string) {
  const value = readString(formData, name);
  return value || null;
}

function assertSecurePassword(password: string) {
  if (password.length < 8) {
    throw new Error("La contraseña debe tener al menos 8 caracteres.");
  }

  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z\d]/.test(password)) {
    throw new Error("La contraseña debe incluir mayúscula, minúscula, número y símbolo.");
  }
}

async function saveBarberPhoto(tenantSlug: string, file: File | null) {
  if (!file || file.size === 0) {
    return null;
  }

  const extension = path.extname(file.name) || ".jpg";
  const safeTenant = tenantSlug.replace(/[^a-z0-9-_]/gi, "-").toLowerCase();
  const fileName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
  const relativeDir = path.join("public", "uploads", "barbers", safeTenant);
  const absoluteDir = path.join(process.cwd(), relativeDir);

  await mkdir(absoluteDir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(absoluteDir, fileName), buffer);

  return `/uploads/barbers/${safeTenant}/${fileName}`;
}

function readWorkingHours(formData: FormData) {
  const result: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];

  for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek += 1) {
    const startTime = readString(formData, `schedule_${dayOfWeek}_start`);
    const endTime = readString(formData, `schedule_${dayOfWeek}_end`);

    if (!startTime || !endTime) {
      continue;
    }

    if (startTime >= endTime) {
      throw new Error("Hay horarios de barbero con rango inválido.");
    }

    result.push({ dayOfWeek, startTime, endTime });
  }

  return result;
}

function revalidateOwnerArea(tenantSlug: string) {
  revalidatePath(`/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/reservar`);
  revalidatePath(`/${tenantSlug}/fila`);
  revalidatePath(`/${tenantSlug}/owner/dashboard`);
  revalidatePath(`/${tenantSlug}/owner/dashboard/turnos`);
  revalidatePath(`/${tenantSlug}/owner/dashboard/servicios`);
  revalidatePath(`/${tenantSlug}/owner/dashboard/empresa`);
  revalidatePath(`/${tenantSlug}/owner/dashboard/analisis`);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantSlug: string }> }
) {
  const { tenantSlug } = await params;
  const tenant = await requireTenantBySlug(tenantSlug);
  const session = await requireSessionForTenantRole(tenantSlug, ["owner", "staff", "platform_admin"]);
  const formData = await request.formData();
  const intent = readString(formData, "intent");
  const section = readString(formData, "section") || "overview";
  const extraRedirectParams = {
    barberId: readString(formData, "barberId"),
    date: readString(formData, "date")
  };

  try {
    switch (intent) {
      case "appointment-status-update": {
        await updateAppointmentStatusForOwner({
          tenantId: tenant.tenantId,
          appointmentId: readString(formData, "appointmentId"),
          status: readString(formData, "status") as AppointmentStatus
        });
        break;
      }
      case "appointment-create-manual": {
        await createManualAppointmentForAdmin({
          tenantId: tenant.tenantId,
          barberId: readString(formData, "barberId"),
          serviceId: readString(formData, "serviceId"),
          datetimeStart: new Date(readString(formData, "scheduledAt")),
          paymentMethod: readString(formData, "paymentMethod") as PaymentMethod,
          customer: {
            fullName: readString(formData, "customerName"),
            phone: readString(formData, "customerPhone"),
            notes: readOptionalString(formData, "customerNotes")
          }
        });
        break;
      }
      case "service-create": {
        await createService({
          tenantId: tenant.tenantId,
          name: readString(formData, "name"),
          description: readOptionalString(formData, "description"),
          durationMinutes: readNumber(formData, "durationMinutes", 30),
          price: readNumber(formData, "price", 0),
          sortOrder: readNumber(formData, "sortOrder", 0),
          isPromotion: readBoolean(formData, "isPromotion")
        });
        break;
      }
      case "service-update": {
        await updateService({
          tenantId: tenant.tenantId,
          serviceId: readString(formData, "serviceId"),
          name: readString(formData, "name"),
          description: readOptionalString(formData, "description"),
          durationMinutes: readNumber(formData, "durationMinutes", 30),
          price: readNumber(formData, "price", 0),
          sortOrder: readNumber(formData, "sortOrder", 0),
          isPromotion: readBoolean(formData, "isPromotion"),
          isActive: readBoolean(formData, "isActive")
        });
        break;
      }
      case "service-delete": {
        await archiveService(tenant.tenantId, readString(formData, "serviceId"));
        break;
      }
      case "company-update": {
        if (!canManageCompany(session.role)) {
          throw new Error("Solo un Administrador puede editar los datos de la empresa.");
        }

        const allowPayAtStore = readBoolean(formData, "allowPayAtStore");
        const allowBankTransfer = readBoolean(formData, "allowBankTransfer");
        const allowMercadoPago = readBoolean(formData, "allowMercadoPago");

        if (!allowPayAtStore && !allowBankTransfer && !allowMercadoPago) {
          throw new Error("La empresa debe tener al menos un método de pago habilitado.");
        }

        await updateTenantAdminSettings({
          tenantId: tenant.tenantId,
          name: readString(formData, "name"),
          companyPhone: readOptionalString(formData, "companyPhone"),
          companyEmail: readOptionalString(formData, "companyEmail"),
          address: readOptionalString(formData, "address"),
          instagramUrl: readOptionalString(formData, "instagramUrl"),
          timezone: readString(formData, "timezone") || tenant.timezone,
          requiresDeposit: readBoolean(formData, "requiresDeposit"),
          depositType: readString(formData, "depositType") || "none",
          depositValue: readNumber(formData, "depositValue", 0),
          allowPayAtStore,
          allowBankTransfer,
          allowMercadoPago,
          updateSensitivePaymentFields: formData.has("sensitiveFieldsUnlocked"),
          transferAlias: readOptionalString(formData, "transferAlias"),
          transferCbu: readOptionalString(formData, "transferCbu"),
          transferHolderName: readOptionalString(formData, "transferHolderName"),
          transferBankName: readOptionalString(formData, "transferBankName"),
          mercadoPagoPublicKey: readOptionalString(formData, "mercadoPagoPublicKey"),
          mercadoPagoAccessToken: readOptionalString(formData, "mercadoPagoAccessToken"),
          logoUrl: readOptionalString(formData, "logoUrl"),
          heroImageUrl: readOptionalString(formData, "heroImageUrl"),
          primaryColor: readString(formData, "primaryColor") || "#111111"
        });
        break;
      }
      case "barber-create": {
        if (!canManageCompany(session.role)) {
          throw new Error("Solo un Administrador puede gestionar barberos.");
        }

        const photo = formData.get("photo");
        const photoUrl = await saveBarberPhoto(tenantSlug, photo instanceof File ? photo : null);
        const barber = await createBarber({
          tenantId: tenant.tenantId,
          fullName: readString(formData, "fullName"),
          bio: readOptionalString(formData, "bio"),
          rating: readNumber(formData, "rating", 4.8),
          photoUrl,
          userId: readOptionalString(formData, "userId")
        });
        await replaceBarberServices({
          tenantId: tenant.tenantId,
          barberId: barber.id,
          serviceIds: formData.getAll("serviceIds").map(String)
        });
        await replaceBarberWorkingHours({
          tenantId: tenant.tenantId,
          barberId: barber.id,
          workingHours: readWorkingHours(formData)
        });
        break;
      }
      case "barber-update": {
        if (!canManageCompany(session.role)) {
          throw new Error("Solo un Administrador puede gestionar barberos.");
        }

        const photo = formData.get("photo");
        const newPhotoUrl = await saveBarberPhoto(tenantSlug, photo instanceof File ? photo : null);
        await updateBarber({
          tenantId: tenant.tenantId,
          barberId: readString(formData, "barberId"),
          fullName: readString(formData, "fullName"),
          bio: readOptionalString(formData, "bio"),
          rating: readNumber(formData, "rating", 4.8),
          photoUrl: newPhotoUrl ?? readOptionalString(formData, "existingPhotoUrl"),
          userId: readOptionalString(formData, "userId"),
          isActive: readBoolean(formData, "isActive")
        });
        await replaceBarberServices({
          tenantId: tenant.tenantId,
          barberId: readString(formData, "barberId"),
          serviceIds: formData.getAll("serviceIds").map(String)
        });
        await replaceBarberWorkingHours({
          tenantId: tenant.tenantId,
          barberId: readString(formData, "barberId"),
          workingHours: readWorkingHours(formData)
        });
        break;
      }
      case "barber-delete": {
        if (!canManageCompany(session.role)) {
          throw new Error("Solo un Administrador puede gestionar barberos.");
        }

        await archiveBarber(tenant.tenantId, readString(formData, "barberId"));
        break;
      }
      case "user-create": {
        if (!canManageUsers(session.role)) {
          throw new Error("Solo un Administrador puede gestionar usuarios.");
        }

        const password = readString(formData, "password");
        const passwordConfirm = readString(formData, "passwordConfirm");
        assertSecurePassword(password);
        if (password !== passwordConfirm) {
          throw new Error("Las contraseñas ingresadas no coinciden.");
        }

        await createTenantUser({
          tenantId: tenant.tenantId,
          email: readString(formData, "email"),
          displayName: readString(formData, "displayName"),
          role: readString(formData, "role") === "owner" ? "owner" : "staff",
          passwordHash: hashPassword(password)
        });
        break;
      }
      case "user-update": {
        if (!canManageUsers(session.role)) {
          throw new Error("Solo un Administrador puede gestionar usuarios.");
        }

        const nextPassword = readString(formData, "password");
        if (nextPassword) {
          assertSecurePassword(nextPassword);
        }

        await updateTenantUser({
          tenantId: tenant.tenantId,
          userId: readString(formData, "userId"),
          email: readString(formData, "email"),
          displayName: readString(formData, "displayName"),
          role: readString(formData, "role") === "owner" ? "owner" : "staff",
          passwordHash: nextPassword ? hashPassword(nextPassword) : null,
          isActive: readBoolean(formData, "isActive")
        });
        break;
      }
      case "user-delete": {
        if (!canManageUsers(session.role)) {
          throw new Error("Solo un Administrador puede gestionar usuarios.");
        }

        await deactivateTenantUser(tenant.tenantId, readString(formData, "userId"));
        break;
      }
      default:
        throw new Error("Acción de administración no soportada.");
    }

    revalidateOwnerArea(tenantSlug);
    return redirectTo(request, tenantSlug, section, "Cambios guardados.", false, extraRedirectParams);
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo completar la acción.";
    return redirectTo(request, tenantSlug, section, message, true, extraRedirectParams);
  }
}
