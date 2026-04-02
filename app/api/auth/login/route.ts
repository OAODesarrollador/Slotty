import { NextRequest, NextResponse } from "next/server";

import { createSession, verifyPassword } from "@/lib/auth";
import { getTenantBySlug } from "@/lib/tenant";
import { getUserByCredentials } from "@/repositories/users";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) {
    return NextResponse.redirect(new URL(`/${tenantSlug}/owner/login?error=1`, request.url));
  }

  const user = await getUserByCredentials(tenant.tenantId, email);
  if (!user || !verifyPassword(password, user.password_hash)) {
    return NextResponse.redirect(new URL(`/${tenantSlug}/owner/login?error=1`, request.url));
  }

  await createSession({
    userId: user.id,
    tenantId: user.tenant_id,
    tenantSlug,
    role: user.role,
    email: user.email,
    displayName: user.display_name
  });

  return NextResponse.redirect(new URL(`/${tenantSlug}/owner/dashboard`, request.url));
}
