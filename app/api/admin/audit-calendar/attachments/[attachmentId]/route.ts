import { fail, ok } from "@/lib/api-response";
import { requireAdminPage } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { deleteObjectByPath } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ attachmentId: string }>;
};

export async function DELETE(_: Request, context: RouteContext) {
  const { error } = await requireAdminPage("audit_calendar");
  if (error) return error;

  const { attachmentId } = await context.params;
  const attachment = await prisma.auditAttachment.findUnique({
    where: { id: attachmentId },
    select: {
      id: true,
      filePath: true,
    },
  });
  if (!attachment) return fail("Attachment not found.", 404);

  await prisma.auditAttachment.delete({
    where: { id: attachmentId },
  });

  const removed = await deleteObjectByPath(attachment.filePath);
  if (!removed.ok) {
    return ok("Attachment deleted with storage warning", {
      id: attachmentId,
      storageError: removed.error,
    });
  }

  return ok("Attachment deleted", { id: attachmentId });
}
