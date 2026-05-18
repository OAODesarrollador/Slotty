import { NextRequest, NextResponse } from "next/server";

import { clearPlatformSession } from "@/lib/platform-auth";

export async function POST(request: NextRequest) {
  await clearPlatformSession();
  return NextResponse.redirect(new URL("/platform/login", request.url), 303);
}
