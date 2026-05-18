import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { requirePlatformRole } from "@/lib/platform-auth";
import {
  assertSlug,
  readBillingStatus,
  readOptionalString,
  readString,
  readTenantPlan,
  readTenantStatus
} from "@/lib/platform-validation";
import { updatePlatformTenantProfile } from "@/repositories/platform";

function redirectToTenant(request: NextRequest, tenantId: string, message: string, isError = false) {
  const url = new URL(`/platform/tenants/${tenantId}`, request.url);
  url.searchParams.set(isError ? "error" : "notice", message);
  return NextResponse.redirect(url, 303);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const session = await requirePlatformRole(["platform_admin"]);
  const { tenantId } = await params;
  const formData = await request.formData();

  try {
    const slug = readString(formData, "slug").toLowerCase();
    assertSlug(slug);

    const updated = await updatePlatformTenantProfile({
      tenantId,
      name: readString(formData, "name"),
      slug,
      companyEmail: readOptionalString(formData, "companyEmail"),
      companyPhone: readOptionalString(formData, "companyPhone"),
      address: readOptionalString(formData, "address"),
      timezone: readString(formData, "timezone") || "America/Argentina/Buenos_Aires",
      status: readTenantStatus(readString(formData, "status")),
      plan: readTenantPlan(readString(formData, "plan")),
      billingStatus: readBillingStatus(readString(formData, "billingStatus")),
      trialEndsAt: readOptionalString(formData, "trialEndsAt"),
      actor: session
    });

    if (!updated) {
      return redirectToTenant(request, tenantId, "Tenant no encontrado.", true);
    }

    revalidatePath("/platform");
    revalidatePath("/platform/tenants");
    revalidatePath(`/platform/tenants/${tenantId}`);
    revalidatePath(`/${updated.slug}`);
    return redirectToTenant(request, tenantId, "Datos globales actualizados.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el tenant.";
    return redirectToTenant(request, tenantId, message, true);
  }
}
