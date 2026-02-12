import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const usernameOrEmail = body.usernameOrEmail || "";
    const password = body.password || "";

    if (!usernameOrEmail || !password) {
      return NextResponse.json(
        { message: "Username/Email and password are required" },
        { status: 400 }
      );
    }

    // ✅ ADMIN LOGIN (ENV)
    if (
      usernameOrEmail === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const res = NextResponse.json({
        ok: true,
        role: "admin",
        redirectTo: "/admin",
      });

      res.cookies.set("admin_token", "logged_in", {
        httpOnly: true,
        path: "/",
      });

      return res;
    }

    // ✅ CLIENT LOGIN (DATABASE)
    const client = await prisma.client.findUnique({
      where: { email: usernameOrEmail },
    });

    if (!client || client.password !== password) {
      return NextResponse.json(
        { message: "Invalid username/email or password" },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      ok: true,
      role: "client",
      clientId: client.id,
      redirectTo: "/client-dashboard",
    });

    res.cookies.set("client_token", "logged_in", {
      httpOnly: true,
      path: "/",
    });

    res.cookies.set("client_id", client.id, {
      httpOnly: true,
      path: "/",
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || "Login failed" },
      { status: 500 }
    );
  }
}
