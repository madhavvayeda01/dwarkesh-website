import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    // 🔐 Admin auth check
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

    if (adminToken !== "logged_in") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, email, password, logoUrl, address, contactNumber } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { message: "Name, email, password are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.client.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { message: "Client already exists with this email" },
        { status: 400 }
      );
    }

    const client = await prisma.client.create({
      data: {
        name,
        email,
        password,
        logoUrl: logoUrl || null,
        address: address || null,
        contactNumber: contactNumber || null,
      },
    });

    return NextResponse.json({ ok: true, client });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to create client" },
      { status: 500 }
    );
  }
}
