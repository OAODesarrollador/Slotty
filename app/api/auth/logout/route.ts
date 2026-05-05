import { NextRequest, NextResponse } from "next/server";

import { clearSession } from "@/lib/auth";
import { tenantPathForHost } from "@/lib/tenant-domain";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const tenantSlug = String(formData.get("tenantSlug") ?? "");
  await clearSession();
  return NextResponse.redirect(
    new URL(tenantPathForHost(request.headers.get("host"), tenantSlug, "/owner/login"), request.url),
    303
  );
}
