import { NextRequest, NextResponse } from "next/server";

import { createSession, verifyPassword } from "@/lib/auth";
import {
  buildLoginRateLimitKey,
  checkLoginRateLimit,
  clearLoginRateLimit,
  recordFailedLogin
} from "@/lib/rate-limit";
import { getTenantBySlug } from "@/lib/tenant";
import { tenantPathForHost } from "@/lib/tenant-domain";
import { getUserByCredentials } from "@/repositories/users";

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

function redirectToLogin(request: NextRequest, tenantSlug: string, error = "1") {
  const safeTenantSlug = tenantSlug || "login";
  const loginPath = tenantPathForHost(request.headers.get("host"), safeTenantSlug, "/owner/login");
  return NextResponse.redirect(new URL(`${loginPath}?error=${error}`, request.url));
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const rateLimitKey = buildLoginRateLimitKey({
    ip: getClientIp(request),
    tenantSlug,
    email
  });
  const rateLimit = checkLoginRateLimit(rateLimitKey);

  if (rateLimit.blocked) {
    return redirectToLogin(request, tenantSlug, "rate_limited");
  }

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    recordFailedLogin(rateLimitKey);
    return redirectToLogin(request, tenantSlug);
  }

  const user = await getUserByCredentials(tenant.tenantId, email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    recordFailedLogin(rateLimitKey);
    return redirectToLogin(request, tenantSlug);
  }

  clearLoginRateLimit(rateLimitKey);
  await createSession({
    userId: user.id,
    tenantId: user.tenant_id,
    tenantSlug,
    role: user.role,
    email: user.email,
    displayName: user.display_name
  });

  return NextResponse.redirect(
    new URL(tenantPathForHost(request.headers.get("host"), tenantSlug, "/owner/dashboard"), request.url)
  );
}
