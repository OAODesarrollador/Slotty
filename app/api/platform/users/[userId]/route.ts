import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

import { hashPassword } from "@/lib/auth";
import { requirePlatformRole } from "@/lib/platform-auth";
import {
  assertSecurePassword,
  readBoolean,
  readPlatformRole,
  readString
} from "@/lib/platform-validation";
import { updatePlatformUser } from "@/repositories/platform-users";

function redirectToUsers(request: NextRequest, message: string, isError = false) {
  const url = new URL("/platform/users", request.url);
  url.searchParams.set(isError ? "error" : "notice", message);
  return NextResponse.redirect(url, 303);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await requirePlatformRole(["platform_admin"]);
  const { userId } = await params;
  const formData = await request.formData();

  try {
    const password = readString(formData, "password");
    const passwordConfirm = readString(formData, "passwordConfirm");
    let passwordHash: string | null = null;

    if (password) {
      assertSecurePassword(password);
      if (password !== passwordConfirm) {
        throw new Error("Las contraseñas no coinciden.");
      }
      passwordHash = hashPassword(password);
    }

    const updated = await updatePlatformUser({
      userId,
      email: readString(formData, "email"),
      displayName: readString(formData, "displayName"),
      role: readPlatformRole(readString(formData, "role")),
      isActive: readBoolean(formData, "isActive"),
      passwordHash,
      actor: session
    });

    if (!updated) {
      return redirectToUsers(request, "Usuario plataforma no encontrado.", true);
    }

    revalidatePath("/platform/users");
    return redirectToUsers(request, "Usuario plataforma actualizado.");
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo actualizar el usuario.";
    return redirectToUsers(request, message, true);
  }
}
