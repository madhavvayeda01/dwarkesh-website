import { PrismaClient, type Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
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

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
