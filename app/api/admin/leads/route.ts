import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

const pagingSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
});

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const parsed = pagingSchema.safeParse({
    page: searchParams.get("page") || "1",
    pageSize: searchParams.get("pageSize") || "10",
  });
  if (!parsed.success) {
    return fail("Invalid pagination params", 400, parsed.error.flatten());
  }

  const { page, pageSize } = parsed.data;

  const skip = (page - 1) * pageSize;

  try {
    const [total, leads] = await Promise.all([
      prisma.lead.count(),
      prisma.lead.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

    logger.info("admin.lead.list.success", { total, page, pageSize });
    return ok("Leads fetched", {
      leads,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    });
  } catch (err: any) {
    logger.error("admin.lead.list.error", { message: err?.message });
    return fail(err?.message || "Failed to fetch leads", 500);
  }
}
