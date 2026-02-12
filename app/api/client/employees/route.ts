import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { buildEmployeeCreateData } from "@/lib/employee-data";

function sanitizeHashOnlyStrings<T extends Record<string, unknown>>(row: T): T {
  const entries = Object.entries(row).map(([key, value]) => {
    if (typeof value !== "string") return [key, value];
    const trimmed = value.trim();
    if (/^#+$/.test(trimmed)) return [key, null];
    return [key, value];
  });

  return Object.fromEntries(entries) as T;
}

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("client_token")?.value;
    const clientId = cookieStore.get("client_id")?.value;

    if (token !== "logged_in" || !clientId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const employees = await prisma.employee.findMany({
      where: { clientId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      ok: true,
      employees: employees.map(sanitizeHashOnlyStrings),
    });
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
    const token = cookieStore.get("client_token")?.value;
    const clientId = cookieStore.get("client_id")?.value;

    if (token !== "logged_in" || !clientId) {
      return NextResponse.json(
        { ok: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = (await req.json()) as Record<string, unknown>;
    const data = buildEmployeeCreateData(body, clientId);

    if (!data.fullName) {
      return NextResponse.json(
        { ok: false, message: "fullName is required" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({ data });

    return NextResponse.json({ ok: true, employee });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to create employee" },
      { status: 500 }
    );
  }
}
