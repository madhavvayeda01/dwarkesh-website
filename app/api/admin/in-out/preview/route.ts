import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";

const querySchema = z.object({
  clientId: z.string().trim().min(1),
  month: z.coerce.number().int().min(1).max(12),
  year: z.coerce.number().int().min(2000).max(2100),
});

type ShiftType = "GENERAL" | "ROTATIONAL";
type GenderOut = "M" | "F" | null;

function normalizeGender(value: string | null | undefined): GenderOut {
  const v = (value || "").trim().toLowerCase();
  if (!v) return null;
  if (v === "m" || v === "male") return "M";
  if (v === "f" || v === "female") return "F";
  return null;
}

function deriveShiftType(typeOfEmployment: string | null | undefined): ShiftType {
  const v = (typeOfEmployment || "").trim().toLowerCase();
  if (v.includes("rot")) return "ROTATIONAL";
  return "GENERAL";
}

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

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
    return NextResponse.json(
      { message: "Invalid query params" },
      { status: 400 }
    );
  }

  const { clientId, month, year } = parsed.data;
  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));
  const totalDaysInMonth = new Date(year, month, 0).getDate();

  const [employees, payrollRows, holidayRows] = await Promise.all([
    prisma.employee.findMany({
      where: { clientId },
      select: {
        id: true,
        empNo: true,
        fullName: true,
        gender: true,
        typeOfEmployment: true,
      },
    }),
    prisma.payrollRecord.findMany({
      where: {
        clientId,
        month,
        year,
        employeeId: { not: null },
      },
      select: {
        employeeId: true,
        payDays: true,
        otHoursTarget: true,
        updatedAt: true,
      },
      orderBy: [{ employeeId: "asc" }, { updatedAt: "desc" }],
      distinct: ["employeeId"],
    }),
    prisma.clientHoliday.findMany({
      where: {
        clientId,
        year,
        date: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
      select: { date: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const payrollByEmployeeId = new Map<string, { payDays: number; otHoursTarget: number }>(
    payrollRows
      .filter((row) => Boolean(row.employeeId))
      .map((row) => [
        row.employeeId as string,
        {
          payDays: Number(row.payDays || 0),
          otHoursTarget: Number(row.otHoursTarget || 0),
        },
      ])
  );

  const responseEmployees = employees
    .filter((emp) => payrollByEmployeeId.has(emp.id))
    .map((emp) => {
      const payroll = payrollByEmployeeId.get(emp.id);
      const gender = normalizeGender(emp.gender);
      const derivedShiftType = deriveShiftType(emp.typeOfEmployment);
      const shiftType = gender === "F" ? "GENERAL" : derivedShiftType;

      return {
        employeeId: emp.id,
        empCode: (emp.empNo || "").trim(),
        employeeName: (emp.fullName || "").trim(),
        payDays: Number(payroll?.payDays || 0),
        otHoursTarget: Number(payroll?.otHoursTarget || 0),
        gender,
        shiftType,
      };
    });

  return NextResponse.json({
    employees: responseEmployees,
    totalDaysInMonth,
    holidays: holidayRows.map((h) => isoDate(h.date)),
  });
}
