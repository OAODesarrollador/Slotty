import { NextRequest, NextResponse } from "next/server";

import { createSession, getSession, hashPassword } from "@/lib/auth";
import { assertSecurePassword, readString } from "@/lib/platform-validation";
import { tenantPathForHost } from "@/lib/tenant-domain";
import { updateTenantUserPasswordAfterForcedChange } from "@/repositories/users";

function redirectToChangePassword(request: NextRequest, tenantSlug: string, message: string, isError = true) {
  const url = new URL(tenantPathForHost(request.headers.get("host"), tenantSlug, "/owner/change-password"), request.url);
  url.searchParams.set(isError ? "error" : "notice", message);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.redirect(new URL("/login", request.url), 303);
  }

  const formData = await request.formData();
  const password = readString(formData, "password");
  const passwordConfirm = readString(formData, "passwordConfirm");

  try {
    assertSecurePassword(password);
    if (password !== passwordConfirm) {
      throw new Error("Las contraseñas no coinciden.");
    }

    const updated = await updateTenantUserPasswordAfterForcedChange({
      tenantId: session.tenantId,
      userId: session.userId,
      passwordHash: hashPassword(password)
    });

    if (!updated) {
      throw new Error("No se pudo actualizar la contraseña.");
    }

    await createSession({
      ...session,
      mustChangePassword: false
    });

    return NextResponse.redirect(
      new URL(tenantPathForHost(request.headers.get("host"), session.tenantSlug, "/owner/dashboard"), request.url),
      303
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar la contraseña.";
    return redirectToChangePassword(request, session.tenantSlug, message, true);
  }
}
