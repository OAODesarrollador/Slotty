import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getEnv } from "@/lib/env";

export type PlatformRole = "platform_admin" | "platform_support" | "platform_readonly";

export interface PlatformSessionUser {
  userId: string;
  role: PlatformRole;
  email: string;
  displayName: string;
}

const PLATFORM_SESSION_COOKIE = "barberia_platform_session";

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return base64url(crypto.createHmac("sha256", getEnv().SESSION_SECRET).update(payload).digest());
}

export function encodePlatformSession(session: PlatformSessionUser) {
  const payload = base64url(JSON.stringify(session));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function decodePlatformSession(token: string): PlatformSessionUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as PlatformSessionUser;
    if (!session.userId || !session.email || !session.displayName || !isPlatformRole(session.role)) {
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function isPlatformRole(role: unknown): role is PlatformRole {
  return role === "platform_admin" || role === "platform_support" || role === "platform_readonly";
}

export async function createPlatformSession(session: PlatformSessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_SESSION_COOKIE, encodePlatformSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

export async function clearPlatformSession() {
  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0
  });
}

export async function getPlatformSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(PLATFORM_SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  return decodePlatformSession(token);
}

export async function requirePlatformSession() {
  const session = await getPlatformSession();
  if (!session) {
    redirect("/platform/login");
  }
  return session;
}

export async function requirePlatformRole(allowedRoles: PlatformRole[]) {
  const session = await requirePlatformSession();
  if (!allowedRoles.includes(session.role)) {
    redirect("/platform?error=No%20tenes%20permisos%20para%20esta%20accion.");
  }
  return session;
}
