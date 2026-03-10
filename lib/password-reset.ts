import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  isMissingColumnError,
  isMissingTableError,
} from "@/lib/prisma-compat";

type ResetAccountType = "CLIENT" | "CONSULTANT";

type ResetAccount = {
  accountType: ResetAccountType;
  accountId: string;
  email: string;
  label: string;
};

type IssueResetTokenInput = {
  account: ResetAccount;
  baseUrl: string;
  requestedIp?: string | null;
  userAgent?: string | null;
};

export const PASSWORD_RESET_TTL_MINUTES = 60;
const PASSWORD_RESET_TTL_MS = PASSWORD_RESET_TTL_MINUTES * 60 * 1000;
const PASSWORD_RESET_COOLDOWN_MS = 60 * 1000;

export function normalizeResetEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function cleanupExpiredPasswordResetTokens() {
  const now = new Date();
  try {
    await prisma.passwordResetToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { usedAt: { not: null } }],
      },
    });
  } catch (error) {
    if (isMissingTableError(error, "PasswordResetToken")) {
      logger.warn("auth.password_reset.store_unavailable", {
        message: "PasswordResetToken table is missing. Run pending migrations.",
      });
      return;
    }
    throw error;
  }
}

export async function findPasswordResetAccountsByEmail(email: string): Promise<ResetAccount[]> {
  const normalizedEmail = normalizeResetEmail(email);
  const [client, consultant] = await Promise.all([
    prisma.client.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    }),
    prisma.consultant.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, email: true },
    }),
  ]);

  const accounts: ResetAccount[] = [];
  if (client) {
    accounts.push({
      accountType: "CLIENT",
      accountId: client.id,
      email: client.email,
      label: "Client account",
    });
  }
  if (consultant) {
    accounts.push({
      accountType: "CONSULTANT",
      accountId: consultant.id,
      email: consultant.email,
      label: "Consultant admin account",
    });
  }

  return accounts;
}

export async function issuePasswordResetToken(input: IssueResetTokenInput) {
  const now = new Date();
  const cooldownSince = new Date(now.getTime() - PASSWORD_RESET_COOLDOWN_MS);
  let recentToken: { id: string } | null = null;
  try {
    recentToken = await prisma.passwordResetToken.findFirst({
      where: {
        accountType: input.account.accountType,
        accountId: input.account.accountId,
        usedAt: null,
        expiresAt: { gt: now },
        createdAt: { gt: cooldownSince },
      },
      select: { id: true },
    });
  } catch (error) {
    if (isMissingTableError(error, "PasswordResetToken")) {
      logger.warn("auth.password_reset.store_unavailable", {
        accountType: input.account.accountType,
        accountId: input.account.accountId,
      });
      return null;
    }
    throw error;
  }

  if (recentToken) {
    logger.info("auth.password_reset.cooldown_skip", {
      accountType: input.account.accountType,
      accountId: input.account.accountId,
    });
    return null;
  }

  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashResetToken(rawToken);
  const expiresAt = new Date(now.getTime() + PASSWORD_RESET_TTL_MS);

  try {
    await prisma.passwordResetToken.deleteMany({
      where: {
        accountType: input.account.accountType,
        accountId: input.account.accountId,
      },
    });

    await prisma.passwordResetToken.create({
      data: {
        email: input.account.email,
        accountType: input.account.accountType,
        accountId: input.account.accountId,
        tokenHash,
        expiresAt,
        requestedIp: input.requestedIp || null,
        userAgent: input.userAgent || null,
      },
    });
  } catch (error) {
    if (isMissingTableError(error, "PasswordResetToken")) {
      logger.warn("auth.password_reset.store_unavailable", {
        accountType: input.account.accountType,
        accountId: input.account.accountId,
      });
      return null;
    }
    throw error;
  }

  return {
    label: input.account.label,
    url: `${input.baseUrl}/reset-password?token=${encodeURIComponent(rawToken)}`,
  };
}

export async function validatePasswordResetToken(rawToken: string) {
  const tokenHash = hashResetToken(rawToken);
  const now = new Date();
  let record: Awaited<ReturnType<typeof prisma.passwordResetToken.findUnique>> = null;
  try {
    record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
  } catch (error) {
    if (isMissingTableError(error, "PasswordResetToken")) {
      return null;
    }
    throw error;
  }

  if (!record || record.usedAt || record.expiresAt <= now) {
    return null;
  }

  return record;
}

export async function resetPasswordWithToken(rawToken: string, passwordHash: string) {
  const tokenHash = hashResetToken(rawToken);
  const now = new Date();

  try {
    return await prisma.$transaction(async (tx) => {
      const token = await tx.passwordResetToken.findUnique({
        where: { tokenHash },
      });

      if (!token || token.usedAt || token.expiresAt <= now) {
        return { ok: false as const };
      }

      const consumed = await tx.passwordResetToken.updateMany({
        where: {
          id: token.id,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: {
          usedAt: now,
        },
      });

      if (consumed.count !== 1) {
        return { ok: false as const };
      }

      if (token.accountType === "CLIENT") {
        try {
          await tx.client.update({
            where: { id: token.accountId },
            data: {
              password: passwordHash,
              sessionVersion: { increment: 1 },
            },
          });
        } catch (error) {
          if (!isMissingColumnError(error, "Client", "sessionVersion")) {
            throw error;
          }
          await tx.client.update({
            where: { id: token.accountId },
            data: {
              password: passwordHash,
            },
          });
        }
      } else {
        try {
          await tx.consultant.update({
            where: { id: token.accountId },
            data: {
              password: passwordHash,
              sessionVersion: { increment: 1 },
            },
          });
        } catch (error) {
          if (!isMissingColumnError(error, "Consultant", "sessionVersion")) {
            throw error;
          }
          await tx.consultant.update({
            where: { id: token.accountId },
            data: {
              password: passwordHash,
            },
          });
        }
      }

      await tx.passwordResetToken.deleteMany({
        where: {
          accountType: token.accountType,
          accountId: token.accountId,
        },
      });

      return {
        ok: true as const,
        accountType: token.accountType,
        email: token.email,
      };
    });
  } catch (error) {
    if (isMissingTableError(error, "PasswordResetToken")) {
      return { ok: false as const };
    }
    throw error;
  }
}

function hashResetToken(rawToken: string) {
  return createHash("sha256").update(rawToken).digest("hex");
}
