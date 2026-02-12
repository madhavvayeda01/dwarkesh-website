import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { buildEmployeeCreateData } from "@/lib/employee-data";

export async function GET(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (token !== "logged_in") {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const clientId = searchParams.get("clientId")?.trim() || undefined;

    const employees = await prisma.employee.findMany({
      where: clientId ? { clientId } : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, employees });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

    if (token !== "logged_in") {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const clientIdRaw = body.clientId ?? body.client_id;
    const clientId =
      typeof clientIdRaw === "string" && clientIdRaw.trim() ? clientIdRaw.trim() : "";

    if (!clientId) {
      return NextResponse.json(
        { ok: false, message: "clientId is required" },
        { status: 400 }
      );
    }

    const data = buildEmployeeCreateData(body, clientId);

    if (!data.fullName) {
      return NextResponse.json(
        { ok: false, message: "fullName is required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data,
    });

    return NextResponse.json({ ok: true, employee });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to create employee" },
      { status: 500 }
    );
  }
}
