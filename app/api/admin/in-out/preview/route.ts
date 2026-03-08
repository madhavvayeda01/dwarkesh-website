import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth-guards";
import { previewInOutGenerator } from "@/lib/shift-master-service";

const querySchema = z.object({
  clientId: z.string().trim().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    clientId: url.searchParams.get("clientId") || "",
    month: url.searchParams.get("month") || "",
    year: url.searchParams.get("year") || "",
  });

  if (!parsed.success) {
    return NextResponse.json({ message: "Invalid query params" }, { status: 400 });
  }

  const preview = await previewInOutGenerator(
    parsed.data.clientId,
    parsed.data.month,
    parsed.data.year
  );

  if ("error" in preview) {
    return NextResponse.json(
      {
        employees: [],
        totalDaysInMonth: 0,
        holidays: [],
        warnings: "warnings" in preview ? preview.warnings : [],
        message: preview.error,
      },
      { status: 200 }
    );
  }

  return NextResponse.json({
    employees: preview.employees,
    totalDaysInMonth: preview.daysInMonth,
    holidays: preview.holidays || [],
    weekendType: preview.weekendType,
    shiftConfig: preview.shiftConfig,
    warnings: preview.warnings || [],
  });
}
