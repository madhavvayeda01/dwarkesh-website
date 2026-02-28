import { ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error, session } = await requireAdmin();
  if (error) return error;

  const consultantCount = await prisma.consultant.count();

  return ok("Settings summary fetched", {
    admin: {
      id: session?.adminId || "env-admin",
      type: session?.adminType || "env_admin",
      name: session?.adminName || "Primary Admin",
      email: session?.adminEmail || process.env.ADMIN_USERNAME || "admin",
    },
    consultantCount,
    security: {
      jwtConfigured: Boolean(process.env.JWT_SECRET),
      envAdminConfigured: Boolean(process.env.ADMIN_USERNAME && process.env.ADMIN_PASSWORD),
      enquiryEmailConfigured: Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL),
      sessionDurationDays: 7,
    },
  });
}
