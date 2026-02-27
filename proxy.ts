import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "session_token";

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const hasSession = Boolean(token);

  if (path.startsWith("/admin") && !hasSession) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  if ((path.startsWith("/client") || path === "/client-dashboard") && !hasSession) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/client/:path*", "/client-dashboard"],
};
