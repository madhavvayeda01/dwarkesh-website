import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireClientModule } from "@/lib/auth-guards";

export async function GET() {
  const { error, session } = await requireClientModule("employees");
  if (error || !session) return error;

  try {
    const templates = await prisma.documentTemplate.findMany({
      where: { clientId: session.clientId },
      select: { id: true, title: true },
      orderBy: { createdAt: "desc" },
    });
    return ok("Templates loaded", { templates });
  } catch (err: any) {
    return fail(err?.message || "Failed to load templates", 500);
  }
}
