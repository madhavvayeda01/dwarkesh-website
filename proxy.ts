import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getClientPageKeyForPath } from "@/lib/module-config";

const SESSION_COOKIE = "session_token";

export async function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const hasSession = Boolean(token);

  if (path.startsWith("/admin") && !hasSession) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  if ((path.startsWith("/client") || path === "/client-dashboard") && !hasSession) {
    return NextResponse.redirect(new URL("/signin", req.url));
  }

  const pageKey = getClientPageKeyForPath(path);
  if (pageKey) {
    const accessUrl = new URL(`/api/client/modules?page=${pageKey}`, req.url);
    const accessRes = await fetch(accessUrl, {
      headers: {
        cookie: req.headers.get("cookie") || "",
      },
      cache: "no-store",
    });

    if (accessRes.status === 401) {
      return NextResponse.redirect(new URL("/signin", req.url));
    }

    if (!accessRes.ok) {
      return NextResponse.redirect(new URL("/client-dashboard", req.url));
    }

    const accessData = await accessRes.json().catch(() => null);
    const enabled = accessData?.data?.enabled ?? false;
    if (!enabled) {
      return NextResponse.redirect(new URL("/client-dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/client/:path*", "/client-dashboard"],
};
