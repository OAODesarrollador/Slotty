import { NextRequest, NextResponse } from "next/server";

import { isLocalHost, isPlatformAdminHost, getTenantSlugFromHost } from "@/lib/tenant-domain";

const PROTECTED_PREFIX = /^\/[^/]+\/owner(?:\/.*)?$/;
const SUBDOMAIN_PROTECTED_PREFIX = /^\/owner(?:\/.*)?$/;
const SESSION_COOKIE = "barberia_session";
const PLATFORM_PROTECTED_PREFIX = /^\/platform(?:\/.*)?$/;
const PLATFORM_API_PREFIX = /^\/api\/platform(?:\/.*)?$/;
const PLATFORM_SESSION_COOKIE = "barberia_platform_session";
const INTERNAL_PATH_PREFIXES = ["/api", "/_next", "/favicon.ico", "/robots.txt", "/sitemap.xml"];
const PUBLIC_FILE = /\.(?:avif|gif|ico|jpg|jpeg|mp4|png|svg|webm|webp)$/i;

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

async function isValidPlatformSessionCookie(token: string | undefined) {
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
      role?: string;
    };
    return session.role === "platform_admin"
      || session.role === "platform_support"
      || session.role === "platform_readonly";
  } catch {
    return false;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host");
  const hostTenantSlug = getTenantSlugFromHost(host);
  const isPlatformHost = isPlatformAdminHost(host) || isLocalHost(host);
  const isPlatformRoute = PLATFORM_PROTECTED_PREFIX.test(pathname);
  const isPlatformApi = PLATFORM_API_PREFIX.test(pathname);

  if ((isPlatformRoute || isPlatformApi) && !isPlatformHost) {
    return new NextResponse(null, { status: 404 });
  }

  if (isPlatformAdminHost(host)) {
    if (pathname === "/") {
      return NextResponse.redirect(new URL("/platform", request.url));
    }

    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/platform/login", request.url));
    }
  }

  if (INTERNAL_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix)) || PUBLIC_FILE.test(pathname)) {
    return NextResponse.next();
  }

  if (isPlatformRoute && pathname !== "/platform/login") {
    const hasValidPlatformSession = await isValidPlatformSessionCookie(
      request.cookies.get(PLATFORM_SESSION_COOKIE)?.value
    );

    if (!hasValidPlatformSession) {
      return NextResponse.redirect(new URL("/platform/login", request.url));
    }
  }

  if (hostTenantSlug) {
    const legacyTenantPrefix = `/${hostTenantSlug}`;

    if (pathname === legacyTenantPrefix || pathname.startsWith(`${legacyTenantPrefix}/`)) {
      const url = request.nextUrl.clone();
      const strippedPath = pathname.slice(legacyTenantPrefix.length) || "/";
      url.pathname = strippedPath;
      return NextResponse.redirect(url, 308);
    }

    if (SUBDOMAIN_PROTECTED_PREFIX.test(pathname) && !pathname.endsWith("/owner/login")) {
      const hasValidSession = await isValidSessionCookie(
        request.cookies.get(SESSION_COOKIE)?.value,
        hostTenantSlug
      );

      if (!hasValidSession) {
        return NextResponse.redirect(new URL("/owner/login", request.url));
      }
    }

    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = `/${hostTenantSlug}${pathname === "/" ? "" : pathname}`;
    return NextResponse.rewrite(rewriteUrl);
  }

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
