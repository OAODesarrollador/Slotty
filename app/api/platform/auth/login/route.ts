import { NextRequest, NextResponse } from "next/server";

import { verifyPassword } from "@/lib/auth";
import { createPlatformSession } from "@/lib/platform-auth";
import {
  buildLoginRateLimitKey,
  checkLoginRateLimit,
  clearLoginRateLimit,
  recordFailedLogin
} from "@/lib/rate-limit";
import { getPlatformUserByCredentials } from "@/repositories/platform-users";

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwardedFor || request.headers.get("x-real-ip") || "unknown";
}

function redirectToLogin(request: NextRequest, error = "1") {
  return NextResponse.redirect(new URL(`/platform/login?error=${error}`, request.url), 303);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const rateLimitKey = buildLoginRateLimitKey({
    ip: getClientIp(request),
    tenantSlug: "platform",
    email
  });
  const rateLimit = checkLoginRateLimit(rateLimitKey);

  if (rateLimit.blocked) {
    return redirectToLogin(request, "rate_limited");
  }

  const user = await getPlatformUserByCredentials(email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    recordFailedLogin(rateLimitKey);
    return redirectToLogin(request);
  }

  clearLoginRateLimit(rateLimitKey);
  await createPlatformSession({
    userId: user.id,
    role: user.role,
    email: user.email,
    displayName: user.display_name
  });

  return NextResponse.redirect(new URL("/platform", request.url), 303);
}
