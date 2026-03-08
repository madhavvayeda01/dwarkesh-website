import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { buildEmployeeCreateData } from "@/lib/employee-data";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { normalizeStoredDateMaybe } from "@/lib/excel-date";

const createEmployeeSchema = z.object({
  fullName: z.string().trim().min(1),
  employmentStatus: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  employeeFileStatus: z.enum(["PENDING", "CREATED"]).optional(),
  shiftCategory: z.enum(["STAFF", "WORKER"]).optional(),
  empNo: z.string().trim().optional(),
  fileNo: z.string().trim().optional(),
  pfNo: z.string().trim().optional(),
  uanNo: z.string().trim().optional(),
  esicNo: z.string().trim().optional(),
  firstName: z.string().trim().optional(),
  surName: z.string().trim().optional(),
  fatherSpouseName: z.string().trim().optional(),
  designation: z.string().trim().optional(),
  currentDept: z.string().trim().optional(),
  salaryWage: z.string().trim().optional(),
  doj: z.string().trim().optional(),
  mobileNumber: z.string().trim().optional(),
  presentAddress: z.string().trim().optional(),
}).passthrough();

function sanitizeHashOnlyStrings<T extends Record<string, unknown>>(row: T): T {
  const entries = Object.entries(row).map(([key, value]) => {
    if (typeof value !== "string") return [key, value];
    const trimmed = value.trim();
    if (/^#+$/.test(trimmed)) return [key, null];
    return [key, value];
  });
  return Object.fromEntries(entries) as T;
}

function inferShiftCategoryFromEmployment(
  typeOfEmployment: string | null | undefined
): "STAFF" | "WORKER" {
  const normalized = String(typeOfEmployment || "").toLowerCase();
  return normalized.includes("staff") ? "STAFF" : "WORKER";
}

function isMissingShiftCategoryColumnError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const message = (err as { message?: unknown }).message;
  if (typeof message !== "string") return false;
  return (
    message.includes('The column `Employee.shiftCategory` does not exist') ||
    message.includes("Employee.shiftCategory")
  );
}

export async function GET() {
  const { error, session } = await requireClientModule("employees");
  if (error || !session) return error;

  try {
    let employees: Array<Record<string, unknown>> = [];
    try {
      employees = (await prisma.employee.findMany({
        where: { clientId: session.clientId },
        orderBy: { createdAt: "desc" },
      })) as unknown as Array<Record<string, unknown>>;
    } catch (innerErr: unknown) {
      if (!isMissingShiftCategoryColumnError(innerErr)) throw innerErr;
      logger.warn("employee.list.legacy_schema_fallback", {
        clientId: session.clientId,
        reason: "Missing Employee.shiftCategory column",
      });
      employees = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        'SELECT * FROM "Employee" WHERE "clientId" = $1 ORDER BY "createdAt" DESC',
        session.clientId
      );
    }

    logger.info("employee.list.success", {
      clientId: session.clientId,
      count: employees.length,
      repairedDateRows: employees.filter((employee) => {
        const nextDob = normalizeStoredDateMaybe(
          employee.dob ? String(employee.dob) : null
        );
        const nextDoj = normalizeStoredDateMaybe(
          employee.doj ? String(employee.doj) : null
        );
        const nextDor = normalizeStoredDateMaybe(
          employee.dor ? String(employee.dor) : null
        );
        return (
          nextDob !== (employee.dob ?? null) ||
          nextDoj !== (employee.doj ?? null) ||
          nextDor !== (employee.dor ?? null)
        );
      }).length,
    });

    return ok(
      "Employees fetched",
      {
        employees: employees.map((employee) =>
          sanitizeHashOnlyStrings({
            ...employee,
            shiftCategory:
              typeof employee.shiftCategory === "string"
                ? employee.shiftCategory
                : inferShiftCategoryFromEmployment(
                    typeof employee.typeOfEmployment === "string"
                      ? employee.typeOfEmployment
                      : null
                  ),
            dob: normalizeStoredDateMaybe(
              typeof employee.dob === "string" ? employee.dob : null
            ),
            doj: normalizeStoredDateMaybe(
              typeof employee.doj === "string" ? employee.doj : null
            ),
            dor: normalizeStoredDateMaybe(
              typeof employee.dor === "string" ? employee.dor : null
            ),
          })
        ),
      }
    );
  } catch (err: any) {
    logger.error("employee.list.error", {
      clientId: session.clientId,
      message: err?.message,
    });
    return fail(err?.message || "Failed to fetch employees", 500);
  }
}

export async function POST(req: Request) {
  const { error, session } = await requireClientModule("employees");
  if (error || !session) return error;

  try {
    const clientId = session.clientId;
    if (!clientId) return fail("Unauthorized", 401);

    const parsed = createEmployeeSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Invalid employee payload", 400, parsed.error.flatten());
    }

    const data = buildEmployeeCreateData(parsed.data, clientId);
    if (!data.fullName) return fail("fullName is required", 400);

    const employee = await prisma.employee.create({ data });
    logger.info("employee.create.success", {
      clientId: session.clientId,
      employeeId: employee.id,
    });
    return ok("Employee created", { employee }, 201);
  } catch (err: any) {
    logger.error("employee.create.error", {
      clientId: session.clientId,
      message: err?.message,
    });
    return fail(err?.message || "Failed to create employee", 500);
  }
}

export async function DELETE() {
  const { error, session } = await requireClientModule("employees");
  if (error || !session) return error;

  try {
    const result = await prisma.employee.deleteMany({
      where: { clientId: session.clientId },
    });

    logger.info("employee.delete_all.success", {
      clientId: session.clientId,
      deleted: result.count,
    });

    return ok("All employees deleted", { deleted: result.count });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete all employees";
    logger.error("employee.delete_all.error", {
      clientId: session.clientId,
      message,
    });
    return fail(message, 500);
  }
}
