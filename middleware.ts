import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Protect /admin page
  if (path.startsWith("/admin")) {
    const token = req.cookies.get("admin_token")?.value;

    if (!token || token !== "logged_in") {
      return NextResponse.redirect(new URL("/signin", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
