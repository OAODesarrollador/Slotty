import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { getEnv } from "@/lib/env";
import type { SessionUser } from "@/lib/types";

const SESSION_COOKIE = "barberia_session";

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload: string) {
  return base64url(crypto.createHmac("sha256", getEnv().SESSION_SECRET).update(payload).digest());
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) {
    return false;
  }

  const current = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(current, "hex"), Buffer.from(expected, "hex"));
}

export function encodeSession(session: SessionUser) {
  const payload = base64url(JSON.stringify(session));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function decodeSession(token: string): SessionUser | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as SessionUser;
  } catch {
    return null;
  }
}

export async function createSession(session: SessionUser) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }

  return decodeSession(token);
}

export async function requireSessionForTenant(tenantSlug: string) {
  const session = await getSession();
  if (!session || (session.tenantSlug !== tenantSlug && session.role !== "platform_admin")) {
    redirect(`/${tenantSlug}/owner/login`);
  }
  return session;
}
