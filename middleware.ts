import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIX = /^\/[^/]+\/owner(?:\/.*)?$/;

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!PROTECTED_PREFIX.test(pathname) || pathname.endsWith('/owner/login')) {
    return NextResponse.next();
  }

  const tenantSlug = pathname.split('/').filter(Boolean)[0];
  const hasSession = Boolean(request.cookies.get('barberia_session')?.value);

  if (!hasSession) {
    return NextResponse.redirect(new URL(`/${tenantSlug}/owner/login`, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next|favicon.ico).*)']
};
