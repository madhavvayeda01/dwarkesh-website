import { z } from "zod";
import bcrypt from "bcrypt";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { REMEMBER_ME_MAX_AGE_SECONDS, setSessionCookie, signJwt } from "@/lib/auth";
import { isMissingColumnError } from "@/lib/prisma-compat";

let clientSessionVersionColumnExists: boolean | null = null;
let consultantSessionVersionColumnExists: boolean | null = null;

const loginSchema = z.object({
  usernameOrEmail: z.string().trim().min(1),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
});

export async function POST(req: Request) {
  try {
    const parsed = loginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Username/Email and password are required", 400, parsed.error.flatten());
    }

    const { usernameOrEmail, password, rememberMe } = parsed.data;
    const normalizedIdentifier = usernameOrEmail.trim().toLowerCase();
    const tokenTtlSeconds = rememberMe ? REMEMBER_ME_MAX_AGE_SECONDS : undefined;
    const cookieOptions = rememberMe
      ? { persistent: true, maxAgeSeconds: REMEMBER_ME_MAX_AGE_SECONDS }
      : { persistent: false as const };

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
      }, tokenTtlSeconds);
      const res = ok("Login successful", { role: "admin", redirectTo: "/admin" });
      setSessionCookie(res, token, cookieOptions);
      logger.info("auth.login.success", { role: "admin", usernameOrEmail });
      return res;
    }

    const [consultant, client] = await Promise.all([
      findConsultantForLogin(normalizedIdentifier),
      findClientForLogin(normalizedIdentifier),
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
        sessionVersion: consultant.sessionVersion ?? 1,
      }, tokenTtlSeconds);
      const res = ok("Login successful", {
        role: "admin",
        redirectTo: "/admin",
      });
      setSessionCookie(res, token, cookieOptions);
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

    const token = signJwt({
      sub: client.id,
      role: "client",
      clientId: client.id,
      sessionVersion: client.sessionVersion ?? 1,
    }, tokenTtlSeconds);
    const res = ok("Login successful", {
      role: "client",
      clientId: client.id,
      redirectTo: "/client-dashboard",
    });
    setSessionCookie(res, token, cookieOptions);
    logger.info("auth.login.success", { role: "client", clientId: client.id });
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Login failed";
    logger.error("auth.login.error", { message });
    return fail("Login failed", 500);
  }
}

async function checkColumnExists(tableName: string, columnName: string) {
  const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    ) AS "exists"
  `;
  return Boolean(result?.[0]?.exists);
}

async function consultantSessionVersionSupported() {
  if (consultantSessionVersionColumnExists !== null) return consultantSessionVersionColumnExists;
  try {
    consultantSessionVersionColumnExists = await checkColumnExists("Consultant", "sessionVersion");
  } catch {
    consultantSessionVersionColumnExists = true;
  }
  return consultantSessionVersionColumnExists;
}

async function clientSessionVersionSupported() {
  if (clientSessionVersionColumnExists !== null) return clientSessionVersionColumnExists;
  try {
    clientSessionVersionColumnExists = await checkColumnExists("Client", "sessionVersion");
  } catch {
    clientSessionVersionColumnExists = true;
  }
  return clientSessionVersionColumnExists;
}

async function findConsultantForLogin(email: string) {
  const supportsSessionVersion = await consultantSessionVersionSupported();

  if (supportsSessionVersion) {
    try {
      return await prisma.consultant.findUnique({
        where: { email },
        select: {
          id: true,
          name: true,
          email: true,
          password: true,
          active: true,
          sessionVersion: true,
        },
      });
    } catch (error) {
      if (!isMissingColumnError(error, "Consultant", "sessionVersion")) {
        throw error;
      }
      consultantSessionVersionColumnExists = false;
    }
  }

  const legacy = await prisma.consultant.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      email: true,
      password: true,
      active: true,
    },
  });
  return legacy ? { ...legacy, sessionVersion: 1 } : null;
}

async function findClientForLogin(email: string) {
  const supportsSessionVersion = await clientSessionVersionSupported();

  if (supportsSessionVersion) {
    try {
      return await prisma.client.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          password: true,
          sessionVersion: true,
        },
      });
    } catch (error) {
      if (!isMissingColumnError(error, "Client", "sessionVersion")) {
        throw error;
      }
      clientSessionVersionColumnExists = false;
    }
  }

  const legacy = await prisma.client.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      password: true,
    },
  });
  return legacy ? { ...legacy, sessionVersion: 1 } : null;
}
