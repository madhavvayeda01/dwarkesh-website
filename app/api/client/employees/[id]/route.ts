import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const emp = await prisma.employee.findUnique({
      where: { id },
    });

    if (!emp || emp.clientId !== clientId) {
      return NextResponse.json(
        { ok: false, message: "Not allowed" },
        { status: 403 }
      );
    }

    await prisma.employee.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to delete employee" },
      { status: 500 }
    );
  }
}
