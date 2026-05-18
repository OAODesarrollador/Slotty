import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth";
import { requirePlatformRole } from "@/lib/platform-auth";
import {
  assertSecurePassword,
  assertSlug,
  readBillingStatus,
  readOptionalString,
  readString,
  readTenantPlan,
  readTenantStatus
} from "@/lib/platform-validation";
import { createPlatformTenant } from "@/repositories/platform";

function redirectTo(request: NextRequest, path: string, message: string, isError = false) {
  const url = new URL(path, request.url);
  url.searchParams.set(isError ? "error" : "notice", message);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const session = await requirePlatformRole(["platform_admin"]);
  const formData = await request.formData();

  try {
    const slug = readString(formData, "slug").toLowerCase();
    const ownerPassword = readString(formData, "ownerPassword");
    const ownerPasswordConfirm = readString(formData, "ownerPasswordConfirm");

    assertSlug(slug);
    assertSecurePassword(ownerPassword);
    if (ownerPassword !== ownerPasswordConfirm) {
      throw new Error("Las contraseñas del owner inicial no coinciden.");
    }

    const tenant = await createPlatformTenant({
      name: readString(formData, "name"),
      slug,
      companyEmail: readOptionalString(formData, "companyEmail"),
      companyPhone: readOptionalString(formData, "companyPhone"),
      address: readOptionalString(formData, "address"),
      timezone: readString(formData, "timezone") || "America/Argentina/Buenos_Aires",
      status: readTenantStatus(readString(formData, "status")),
      plan: readTenantPlan(readString(formData, "plan")),
      billingStatus: readBillingStatus(readString(formData, "billingStatus")),
      ownerEmail: readString(formData, "ownerEmail"),
      ownerDisplayName: readString(formData, "ownerDisplayName"),
      ownerPasswordHash: hashPassword(ownerPassword),
      actor: session
    });

    revalidatePath("/platform");
    revalidatePath("/platform/tenants");
    return redirectTo(request, `/platform/tenants/${tenant.id}`, "Tenant creado.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el tenant.";
    return redirectTo(request, "/platform/tenants/new", message, true);
  }
}
