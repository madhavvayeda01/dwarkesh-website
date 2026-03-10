import { PrismaClient, type Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaTargetLogged: boolean | undefined;
};

const prismaLogConfig: Prisma.LogLevel[] =
  process.env.DEBUG_PRISMA_QUERIES === "1" || process.env.NODE_ENV !== "production"
    ? ["query", "error"]
    : ["error"];

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: prismaLogConfig,
  });

if (process.env.NODE_ENV !== "production" && !globalForPrisma.prismaTargetLogged) {
  const raw = process.env.DATABASE_URL;
  if (!raw) {
    console.warn("[prisma] DATABASE_URL is not configured.");
  } else {
    try {
      const parsed = new URL(raw);
      const database = parsed.pathname.replace(/^\/+/, "") || "(default)";
      const port = parsed.port ? `:${parsed.port}` : "";
      console.info(
        `[prisma] Runtime datasource target: ${parsed.protocol}//${parsed.hostname}${port}/${database}`
      );
    } catch {
      console.warn("[prisma] DATABASE_URL is configured but could not be parsed.");
    }
  }
  globalForPrisma.prismaTargetLogged = true;
}

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
