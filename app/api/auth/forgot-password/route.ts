import { z } from "zod";
import { fail, ok } from "@/lib/api-response";
import { getAppBaseUrl } from "@/lib/app-url";
import { sendPasswordResetEmail } from "@/lib/email/send-password-reset-email";
import {
  PASSWORD_RESET_TTL_MINUTES,
  cleanupExpiredPasswordResetTokens,
  findPasswordResetAccountsByEmail,
  issuePasswordResetToken,
  normalizeResetEmail,
} from "@/lib/password-reset";
import { logger } from "@/lib/logger";

const forgotPasswordSchema = z.object({
  email: z.string().trim().email("Enter a valid email address."),
});

const GENERIC_MESSAGE =
  "If an account exists for that email, a password reset link will be sent shortly.";

export async function POST(req: Request) {
  try {
    const parsed = forgotPasswordSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Enter a valid email address.", 400, parsed.error.flatten());
    }

    await cleanupExpiredPasswordResetTokens();

    const email = normalizeResetEmail(parsed.data.email);
    const baseUrl = getAppBaseUrl(req);
    const forwardedFor = req.headers.get("x-forwarded-for");
    const requestedIp = forwardedFor ? forwardedFor.split(",")[0]?.trim() : null;
    const userAgent = req.headers.get("user-agent");
    const accounts = await findPasswordResetAccountsByEmail(email);

    if (accounts.length > 0) {
      const links = (
        await Promise.all(
          accounts.map((account) =>
            issuePasswordResetToken({
              account,
              baseUrl,
              requestedIp,
              userAgent,
            })
          )
        )
      ).filter((link): link is { label: string; url: string } => Boolean(link));

      if (links.length > 0) {
        const sent = await sendPasswordResetEmail({
          to: email,
          links,
          expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
        });

        if (!sent.ok) {
          logger.error("auth.password_reset.email_send_failed", {
            email,
            skipped: sent.skipped,
            error: sent.error,
            accountCount: accounts.length,
          });
        } else {
          logger.info("auth.password_reset.email_sent", {
            email,
            accountCount: accounts.length,
          });
        }
      }
    } else {
      logger.info("auth.password_reset.request_unknown_email", { email });
    }

    return ok(GENERIC_MESSAGE, null);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Forgot password failed";
    logger.error("auth.password_reset.request_error", { message });
    return ok(GENERIC_MESSAGE, null);
  }
}

