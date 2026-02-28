import { fail, ok } from "@/lib/api-response";
import { ADMIN_PAGE_DEFINITIONS } from "@/lib/admin-config";
import { getAdminPageAccessForSession } from "@/lib/admin-access";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return fail("Not authenticated", 401, { loggedIn: false });
  }

  const allowedPages = await getAdminPageAccessForSession(session);

  return ok("Authenticated", {
    loggedIn: true,
    admin: {
      id: session.adminId || "env-admin",
      type: session.adminType || "env_admin",
      name: session.adminName || "Primary Admin",
      email: session.adminEmail || process.env.ADMIN_USERNAME || "admin",
    },
    allowedPages,
    pageDefinitions: ADMIN_PAGE_DEFINITIONS,
  });
}
