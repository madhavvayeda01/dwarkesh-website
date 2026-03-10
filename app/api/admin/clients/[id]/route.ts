import bcrypt from "bcrypt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { logger } from "@/lib/logger";
import { passwordSchema } from "@/lib/password-policy";
import { isMissingColumnError, isMissingTableError } from "@/lib/prisma-compat";

const updateClientSchema = z.object({
  password: passwordSchema.optional(),
  email: z.string().trim().email("Enter a valid client email.").optional(),
}).refine((value) => Boolean(value.password || value.email), {
  message: "No client changes provided.",
});

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    await prisma.client.delete({ where: { id } });
    logger.info("admin.client.delete.success", { clientId: id });
    return ok("Client deleted", null);
  } catch (err: any) {
    logger.error("admin.client.delete.error", { message: err?.message });
    return fail("Failed to delete client", 500);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const { id } = await params;
    const parsed = updateClientSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Invalid client update payload", 400, parsed.error.flatten());
    }

    const nextEmail = parsed.data.email?.trim().toLowerCase();
    if (nextEmail) {
      const existingClient = await prisma.client.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });
      if (existingClient && existingClient.id !== id) {
        return fail("A client with this email already exists.", 409);
      }

      const existingConsultant = await prisma.consultant.findUnique({
        where: { email: nextEmail },
        select: { id: true },
      });
      if (existingConsultant) {
        return fail("This email is already being used by a consultant account.", 409);
      }
    }

    const hashed = parsed.data.password
      ? await bcrypt.hash(parsed.data.password, 10)
      : null;

    if (hashed) {
      try {
        await prisma.client.update({
          where: { id },
          data: {
            ...(nextEmail ? { email: nextEmail } : {}),
            password: hashed,
            sessionVersion: { increment: 1 },
          },
          select: { id: true },
        });
      } catch (error) {
        if (!isMissingColumnError(error, "Client", "sessionVersion")) {
          throw error;
        }
        await prisma.client.update({
          where: { id },
          data: {
            ...(nextEmail ? { email: nextEmail } : {}),
            password: hashed,
          },
          select: { id: true },
        });
      }
      await clearClientResetTokensIfAvailable(id);
    } else {
      await prisma.client.update({
        where: { id },
        data: {
          email: nextEmail,
        },
        select: { id: true },
      });
    }

    if (hashed && nextEmail) {
      logger.info("admin.client.credentials_update.success", { clientId: id, email: nextEmail });
      return ok("Client email and password updated", null);
    }

    if (hashed) {
      logger.info("admin.client.password_update.success", { clientId: id });
      return ok("Password updated", null);
    }

    logger.info("admin.client.email_update.success", { clientId: id, email: nextEmail });
    return ok("Client email updated", null);
  } catch (err: any) {
    if (err?.code === "P2025") {
      return fail("Client not found", 404);
    }
    if (err?.code === "P2002") {
      return fail("A client with this email already exists.", 409);
    }

    logger.error("admin.client.update.error", { message: err?.message });
    return fail("Failed to update client", 500);
  }
}

async function clearClientResetTokensIfAvailable(clientId: string) {
  try {
    await prisma.passwordResetToken.deleteMany({
      where: {
        accountType: "CLIENT",
        accountId: clientId,
      },
    });
  } catch (error) {
    if (isMissingTableError(error, "PasswordResetToken")) {
      logger.warn("admin.client.password_reset_store_missing", { clientId });
      return;
    }
    throw error;
  }
}
