import bcrypt from "bcrypt";
import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { logger } from "@/lib/logger";
import { passwordSchema } from "@/lib/password-policy";
import {
  cleanupExpiredPasswordResetTokens,
  resetPasswordWithToken,
  validatePasswordResetToken,
} from "@/lib/password-reset";

const tokenSchema = z.object({
  token: z.string().trim().min(1),
});

const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1),
    password: passwordSchema,
    confirmPassword: z.string().trim().min(1),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const parsed = tokenSchema.safeParse({
      token: url.searchParams.get("token"),
    });

    if (!parsed.success) {
      return fail("Reset link is invalid or incomplete.", 400, parsed.error.flatten());
    }

    await cleanupExpiredPasswordResetTokens();
    const token = await validatePasswordResetToken(parsed.data.token);
    if (!token) {
      return fail("This reset link is invalid or has expired.", 400);
    }

    return ok("Reset link is valid.", {
      expiresAt: token.expiresAt.toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reset token validation failed";
    logger.error("auth.password_reset.validate_error", { message });
    return fail("Failed to validate reset link.", 500);
  }
}

export async function POST(req: Request) {
  try {
    const parsed = resetPasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Invalid reset request.", 400, parsed.error.flatten());
    }

    await cleanupExpiredPasswordResetTokens();

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const result = await resetPasswordWithToken(parsed.data.token, passwordHash);

    if (!result.ok) {
      return fail("This reset link is invalid or has expired.", 400);
    }

    logger.info("auth.password_reset.completed", {
      email: result.email,
      accountType: result.accountType,
    });

    return ok("Password has been reset successfully.", null);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Reset password failed";
    logger.error("auth.password_reset.reset_error", { message });
    return fail("Failed to reset password.", 500);
  }
}
