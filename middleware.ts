import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIX = /^\/[^/]+\/owner(?:\/.*)?$/;
const SESSION_COOKIE = "barberia_session";

function base64url(input: ArrayBuffer) {
  const bytes = new Uint8Array(input);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64url(input: string) {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(input.length / 4) * 4,
    "="
  );
  return atob(padded);
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let index = 0; index < a.length; index += 1) {
    diff |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return diff === 0;
}

async function isValidSessionCookie(token: string | undefined, tenantSlug: string) {
  const sessionSecret = process.env.SESSION_SECRET;
  if (!token || !sessionSecret) {
    return false;
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(sessionSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const expectedSignature = base64url(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload))
  );

  if (!safeEqual(signature, expectedSignature)) {
    return false;
  }

  try {
    const session = JSON.parse(decodeBase64url(payload)) as {
      tenantSlug?: string;
      role?: string;
    };
    return session.tenantSlug === tenantSlug || session.role === "platform_admin";
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_PREFIX.test(pathname) || pathname.endsWith('/owner/login')) {
    return NextResponse.next();
  }

  const tenantSlug = pathname.split('/').filter(Boolean)[0];
  const hasValidSession = await isValidSessionCookie(
    request.cookies.get(SESSION_COOKIE)?.value,
    tenantSlug
  );

  if (!hasValidSession) {
    return NextResponse.redirect(new URL(`/${tenantSlug}/owner/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)']
};
