import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth";
import { requirePlatformRole } from "@/lib/platform-auth";
import { assertSecurePassword, readString } from "@/lib/platform-validation";
import { resetPlatformTenantUserPassword } from "@/repositories/platform";

function redirectToTenant(request: NextRequest, tenantId: string, message: string, isError = false) {
  const url = new URL(`/platform/tenants/${tenantId}`, request.url);
  url.searchParams.set(isError ? "error" : "notice", message);
  return NextResponse.redirect(url, 303);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> }
) {
  const session = await requirePlatformRole(["platform_admin", "platform_support"]);
  const { tenantId, userId } = await params;
  const formData = await request.formData();

  try {
    const password = readString(formData, "password");
    const passwordConfirm = readString(formData, "passwordConfirm");
    assertSecurePassword(password);
    if (password !== passwordConfirm) {
      throw new Error("Las contraseñas no coinciden.");
    }

    const updated = await resetPlatformTenantUserPassword({
      tenantId,
      userId,
      passwordHash: hashPassword(password),
      actor: session
    });

    if (!updated) {
      return redirectToTenant(request, tenantId, "Usuario tenant no encontrado.", true);
    }

    revalidatePath(`/platform/tenants/${tenantId}`);
    return redirectToTenant(request, tenantId, "Contraseña actualizada.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la contraseña.";
    return redirectToTenant(request, tenantId, message, true);
  }
}
