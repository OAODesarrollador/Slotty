import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { requirePlatformRole } from "@/lib/platform-auth";
import { updatePlatformTenantActiveState } from "@/repositories/platform";

function redirectToTenant(request: NextRequest, tenantId: string, message: string, isError = false) {
  const url = new URL(`/platform/tenants/${tenantId}`, request.url);
  url.searchParams.set(isError ? "error" : "notice", message);
  return NextResponse.redirect(url, 303);
}

function readBoolean(formData: FormData, name: string) {
  return formData.get(name) === "true" || formData.get(name) === "on";
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  const session = await requirePlatformRole(["platform_admin"]);
  const { tenantId } = await params;
  const formData = await request.formData();
  const isActive = readBoolean(formData, "isActive");

  const updated = await updatePlatformTenantActiveState({
    tenantId,
    isActive,
    actor: session
  });

  if (!updated) {
    return redirectToTenant(request, tenantId, "Tenant no encontrado.", true);
  }

  revalidatePath("/platform");
  revalidatePath("/platform/tenants");
  revalidatePath(`/platform/tenants/${tenantId}`);
  revalidatePath(`/${updated.slug}`);
  revalidatePath(`/${updated.slug}/owner/dashboard`);

  return redirectToTenant(
    request,
    tenantId,
    updated.is_active ? "Tenant reactivado." : "Tenant suspendido."
  );
}
