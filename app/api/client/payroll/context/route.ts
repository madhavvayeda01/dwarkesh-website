import { WeekendType } from "@prisma/client";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { loadAdvanceSource } from "@/lib/advance-source";
import { requireClientModule } from "@/lib/auth-guards";
import { normalizeEmployeeCode } from "@/lib/employee-code";
import {
  resolvePayrollMasterWeeklyOffAndCap,
  weekdayName,
} from "@/lib/payroll-master";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  month: z.coerce.number().int().min(0).max(11),
  year: z.coerce.number().int().min(2000).max(2100),
});

function toNumber(value: string | null | undefined, fallback = 0): number {
  if (!value) return fallback;
  const normalized = String(value).replace(/,/g, "").trim();
  if (!normalized) return fallback;
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
}

export async function GET(req: Request) {
  const { error, session } = await requireClientModule("payroll");
  if (error || !session) return error;
  if (!session.clientId) return fail("Unauthorized", 401);

  const parsed = querySchema.safeParse({
    month: new URL(req.url).searchParams.get("month"),
    year: new URL(req.url).searchParams.get("year"),
  });
  if (!parsed.success) return fail("Invalid query", 400, parsed.error.flatten());

  const { month, year } = parsed.data;
  const clientId = session.clientId;

  try {
    const [client, employees, shiftConfig, advanceSource] = await Promise.all([
      prisma.client.findUnique({
        where: { id: clientId },
        select: { id: true, name: true },
      }),
      prisma.employee.findMany({
        where: { clientId, employmentStatus: "ACTIVE" },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          empNo: true,
          employmentStatus: true,
          uanNo: true,
          esicNo: true,
          fullName: true,
          currentDept: true,
          designation: true,
          doj: true,
          salaryWage: true,
          bankAcNo: true,
          ifscCode: true,
          bankName: true,
        },
      }),
      prisma.clientShiftConfig.findUnique({
        where: { clientId },
        select: { weekendType: true },
      }),
      loadAdvanceSource(clientId, month, year),
    ]);

    const warnings: string[] = [];
    const weekendType: WeekendType = shiftConfig?.weekendType ?? "SUN";
    if (!shiftConfig) {
      warnings.push("Shift config not found. Falling back to Sunday for monthly cap days.");
    }
    warnings.push(...advanceSource.debug.warnings);

    const rows = employees.map((employee, index) => {
      const code = normalizeEmployeeCode(employee.empNo);
      const resolved = resolvePayrollMasterWeeklyOffAndCap({
        clientId,
        employeeId: employee.id,
        year,
        monthIndex: month,
        weekendType,
      });
      return {
        id: employee.id,
        srNo: index + 1,
        uanNo: employee.uanNo || "",
        esicNo: employee.esicNo || "",
        empNo: employee.empNo || "",
        status: employee.employmentStatus,
        employeeName: employee.fullName || "",
        department: employee.currentDept || "",
        designation: employee.designation || "",
        doj: employee.doj || "",
        bankAcNo: employee.bankAcNo || "",
        ifscCode: employee.ifscCode || "",
        bankName: employee.bankName || "",
        actualRateOfPay: toNumber(employee.salaryWage, 0),
        skillCategory: 3 as const,
        actualWorkingDays: 0,
        monthlyCapDaysY: resolved.monthlyCapDaysY,
        weeklyOffDay: resolved.weeklyOffDay,
        weeklyOffLabel: weekdayName(resolved.weeklyOffDay),
        otherBenefit: 0,
        tds: 0,
        loan: 0,
        adv: code ? advanceSource.amountsByCode.get(code) ?? 0 : 0,
        tea: 0,
        lwf: 0,
      };
    });

    return ok("Payroll context fetched", {
      clientId,
      clientName: client?.name || "Client",
      employeeCount: employees.length,
      month,
      year,
      weekendType,
      warnings,
      rows,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to load payroll context";
    return fail(message, 500);
  }
}
