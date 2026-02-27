import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const clients = await prisma.client.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { createdAt: "desc" },
    });

    return ok("Clients fetched", { clients });
  } catch (err: any) {
    logger.error("admin.client.list.error", { message: err?.message });
    return fail(err?.message || "Failed to fetch clients", 500);
  }
}
