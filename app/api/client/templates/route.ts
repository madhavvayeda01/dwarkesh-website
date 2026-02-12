import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const cookieStore = await cookies();

    // ✅ Your client login must be setting this cookie
    const clientId = cookieStore.get("client_id")?.value;

    if (!clientId) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.documentTemplate.findMany({
      where: { clientId },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, templates });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to load templates" },
      { status: 500 }
    );
  }
}
