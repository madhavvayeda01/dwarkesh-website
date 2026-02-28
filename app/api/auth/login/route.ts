import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { setSessionCookie, signJwt } from "@/lib/auth";

const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Username/Email and password are required", 400, parsed.error.flatten());
    }

    const { usernameOrEmail, password } = parsed.data;
    const normalizedIdentifier = usernameOrEmail.trim().toLowerCase();

    if (
      usernameOrEmail === process.env.ADMIN_USERNAME &&
      password === process.env.ADMIN_PASSWORD
    ) {
      const token = signJwt({
        sub: "admin",
        role: "admin",
        adminType: "env_admin",
        adminName: "Primary Admin",
        adminEmail: process.env.ADMIN_USERNAME || "admin",
      });
      const res = ok("Login successful", { role: "admin", redirectTo: "/admin" });
      setSessionCookie(res, token);
      logger.info("auth.login.success", { role: "admin", usernameOrEmail });
      return res;
    }

    const [consultant, client] = await Promise.all([
      prisma.consultant.findUnique({
        where: { email: normalizedIdentifier },
      }),
      prisma.client.findUnique({
        where: { email: normalizedIdentifier },
      }),
    ]);

    if (consultant && client) {
      logger.warn("auth.login.email_namespace_collision", {
        identifier: normalizedIdentifier,
        consultantId: consultant.id,
        clientId: client.id,
      });
    }

    let validConsultantPassword = false;
    if (consultant?.active) {
      validConsultantPassword = await bcrypt.compare(password, consultant.password);
    }

    if (consultant?.active && validConsultantPassword) {
      const token = signJwt({
        sub: consultant.id,
        role: "admin",
        adminId: consultant.id,
        adminType: "consultant",
        adminName: consultant.name,
        adminEmail: consultant.email,
      });
      const res = ok("Login successful", {
        role: "admin",
        redirectTo: "/admin",
      });
      setSessionCookie(res, token);
      logger.info("auth.login.success", { role: "consultant", consultantId: consultant.id });
      return res;
    }

    if (!client) {
      if (consultant && !consultant.active) {
        logger.warn("auth.login.consultant_inactive", { consultantId: consultant.id });
        return fail("This consultant account is inactive", 403);
      }

      if (consultant) {
        logger.warn("auth.login.invalid_consultant_password", {
          usernameOrEmail: normalizedIdentifier,
          consultantId: consultant.id,
        });
      }

      logger.warn("auth.login.invalid_user", { usernameOrEmail });
      return fail("Invalid username/email or password", 401);
    }

    const isBcryptHash = /^\$2[aby]\$/.test(client.password);
    const valid = isBcryptHash
      ? await bcrypt.compare(password, client.password)
      : client.password === password;

    if (!valid) {
      logger.warn("auth.login.invalid_password", { usernameOrEmail, clientId: client.id });
      return fail("Invalid username/email or password", 401);
    }

    const token = signJwt({ sub: client.id, role: "client", clientId: client.id });
    const res = ok("Login successful", {
      role: "client",
      clientId: client.id,
      redirectTo: "/client-dashboard",
    });
    setSessionCookie(res, token);
    logger.info("auth.login.success", { role: "client", clientId: client.id });
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    logger.error("auth.login.error", { message });
    return fail(message, 500);
  }
}
