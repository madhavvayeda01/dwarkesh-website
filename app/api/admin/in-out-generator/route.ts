import { z } from "zod";
import { NextResponse } from "next/server";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import {
  generateInOutForClient,
  loadAttendanceResultView,
  previewInOutGenerator,
} from "@/lib/admin-inout-generator";

const requestSchema = z.object({
  clientId: z.string().trim().min(1),
  month: z.number().int().min(1).max(12),
  year: z.number().int().min(2000).max(2100),
});

const querySchema = z.object({
  clientId: z.string().trim().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(req: Request) {
  try {
    const probeUrl = new URL(req.url);
    if (probeUrl.searchParams.get("__route_probe") === "1") {
      return NextResponse.json({ handler: "app/api/admin/in-out-generator/route.ts" });
    }

    const { error } = await requireAdmin();
    if (error) return error;

    const parsed = querySchema.safeParse({
      clientId: probeUrl.searchParams.get("clientId") || "",
      month: probeUrl.searchParams.get("month") || "",
      year: probeUrl.searchParams.get("year") || "",
    });
    if (!parsed.success) {
      return ok("Invalid query. Returning empty preview.", {
        daysInMonth: 0,
        holidaysCount: 0,
        employees: [],
        warnings: [],
        attendanceView: { days: [], rows: [] },
      });
    }

    const preview = await previewInOutGenerator(
      parsed.data.clientId,
      parsed.data.month,
      parsed.data.year
    );

    const previewAny = preview as any;
    const warnings = Array.isArray(previewAny?.warnings)
      ? previewAny.warnings
      : Array.isArray(previewAny?.missingEmployeePayroll)
        ? previewAny.missingEmployeePayroll
        : [];

    const employeesFromMatched = Array.isArray(previewAny?.matchedEmployees) ? previewAny.matchedEmployees : null;
    const employeesFromLegacy = Array.isArray(previewAny?.employees) ? previewAny.employees : null;
    const employees = employeesFromMatched ?? employeesFromLegacy ?? [];

    let attendanceView: { days: number[]; rows: unknown[] } = { days: [], rows: [] };
    try {
      const loadedAttendance = await loadAttendanceResultView(
        parsed.data.clientId,
        parsed.data.month,
        parsed.data.year
      );
      attendanceView = {
        days: Array.isArray((loadedAttendance as any)?.days) ? (loadedAttendance as any).days : [],
        rows: Array.isArray((loadedAttendance as any)?.rows) ? (loadedAttendance as any).rows : [],
      };
    } catch {
      attendanceView = { days: [], rows: [] };
    }

    const daysInMonth = Number(previewAny?.daysInMonth || 0);
    const holidaysCount = Number(previewAny?.holidaysCount || 0);
    const hadLoadError = typeof previewAny?.error === "string" && previewAny.error.length > 0;

    if (hadLoadError && employees.length === 0) {
      return ok("In-Out generator preview loaded with warnings.", {
        daysInMonth,
        holidaysCount,
        employees: [],
        warnings,
        attendanceView,
      });
    }

    return ok("In-Out generator preview loaded", {
      daysInMonth,
      holidaysCount,
      employees,
      warnings,
      attendanceView,
    });
  } catch (error: any) {
    console.error(error);
    return NextResponse.json(
      {
        success: false,
        message: "generator crashed",
        error: String(error),
        stack: error?.stack,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = requestSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid payload", 400, parsed.error.flatten());

  const result = await generateInOutForClient(
    parsed.data.clientId,
    parsed.data.month,
    parsed.data.year
  );
  if ("error" in result) {
    return fail(
      String(result.error || "Generation failed"),
      400,
      "missingEmployeePayroll" in result ? { missingEmployeePayroll: result.missingEmployeePayroll || [] } : null
    );
  }
  return ok(
    result.partialSuccess
      ? "Attendance generated with partial success. Some employees failed."
      : "Attendance generated successfully",
    result
  );
}
