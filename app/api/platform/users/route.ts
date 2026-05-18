import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth";
import { requirePlatformRole } from "@/lib/platform-auth";
import { assertSecurePassword, readPlatformRole, readString } from "@/lib/platform-validation";
import { createPlatformUser } from "@/repositories/platform-users";

function redirectToUsers(request: NextRequest, message: string, isError = false) {
  const url = new URL("/platform/users", request.url);
  url.searchParams.set(isError ? "error" : "notice", message);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: NextRequest) {
  const session = await requirePlatformRole(["platform_admin"]);
  const formData = await request.formData();

  try {
    const password = readString(formData, "password");
    const passwordConfirm = readString(formData, "passwordConfirm");
    assertSecurePassword(password);
    if (password !== passwordConfirm) {
      throw new Error("Las contraseñas no coinciden.");
    }

    await createPlatformUser({
      email: readString(formData, "email"),
      displayName: readString(formData, "displayName"),
      role: readPlatformRole(readString(formData, "role")),
      passwordHash: hashPassword(password),
      actor: session
    });

    revalidatePath("/platform/users");
    return redirectToUsers(request, "Usuario plataforma creado.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo crear el usuario.";
    return redirectToUsers(request, message, true);
  }
}
