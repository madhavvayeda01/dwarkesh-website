import { fail, ok } from "@/lib/api-response";
import { getSessionFromCookies } from "@/lib/auth";

export async function GET() {
  const session = await getSessionFromCookies();
  if (!session || session.role !== "admin") {
    return fail("Not authenticated", 401, { loggedIn: false });
  }

  return ok("Authenticated", {
    loggedIn: true,
    admin: "admin",
  });
}
