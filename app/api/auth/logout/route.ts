import { NextRequest, NextResponse } from "next/server";

import { clearSession } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await clearSession();
  return NextResponse.redirect(new URL(`/${tenantSlug}/owner/login`, request.url), 303);
}
