import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

    console.log("ADMIN TOKEN:", adminToken);

    if (adminToken !== "logged_in") {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const clients = await prisma.client.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, clients });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to fetch clients" },
      { status: 500 }
    );
  }
}
