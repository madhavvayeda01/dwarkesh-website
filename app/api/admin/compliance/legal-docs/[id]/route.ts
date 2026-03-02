import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import {
  formatDateForInput,
  normalizeOptionalString,
  parseDateInput,
} from "@/lib/compliance-legal-docs";

const updateSchema = z.object({
  name: z.string().trim().min(1),
  issueDate: z.string().trim().optional().or(z.literal("")),
  expiryDate: z.string().trim().min(1),
  remarks: z.string().trim().optional().or(z.literal("")),
});

function toDocumentPayload(document: {
  id: string;
  name: string;
  issueDate: Date | null;
  expiryDate: Date;
  remarks: string | null;
  fileUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: document.id,
    name: document.name,
    issueDate: formatDateForInput(document.issueDate),
    expiryDate: formatDateForInput(document.expiryDate),
    remarks: document.remarks || "",
    fileUrl: document.fileUrl,
    createdAt: document.createdAt.toISOString(),
    updatedAt: document.updatedAt.toISOString(),
  };
}

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const params = await context.params;
  const parsed = updateSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid legal doc payload", 400, parsed.error.flatten());

  const issueDate = parseDateInput(parsed.data.issueDate);
  const expiryDate = parseDateInput(parsed.data.expiryDate);
  if (!expiryDate) return fail("Expiry date is required", 400);

  try {
    const document = await prisma.complianceLegalDocument.update({
      where: { id: params.id },
      data: {
        name: parsed.data.name,
        issueDate,
        expiryDate,
        remarks: normalizeOptionalString(parsed.data.remarks),
      },
    });

    return ok("Compliance legal doc updated", { document: toDocumentPayload(document) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update legal doc";
    return fail(message, 500);
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const params = await context.params;

  try {
    await prisma.complianceNotification.deleteMany({
      where: { documentId: params.id },
    });
    await prisma.complianceLegalDocument.delete({
      where: { id: params.id },
    });
    return ok("Compliance legal doc deleted", { id: params.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to delete legal doc";
    return fail(message, 500);
  }
}
