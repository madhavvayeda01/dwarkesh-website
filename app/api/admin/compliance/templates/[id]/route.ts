import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { deleteObjectByPath } from "@/lib/storage";

function extractStoragePath(fileUrl: string) {
  const marker = "/storage/v1/object/public/uploads/";
  const markerIndex = fileUrl.indexOf(marker);
  if (markerIndex >= 0) {
    return fileUrl.slice(markerIndex + marker.length);
  }

  if (fileUrl.startsWith("/uploads/")) {
    return fileUrl.slice("/uploads/".length);
  }

  return null;
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin();
  if (error) return error;

  const params = await context.params;
  const template = await prisma.complianceScheduleTemplate.findUnique({
    where: { id: params.id },
  });
  if (!template) return fail("Template not found", 404);

  const objectPath = extractStoragePath(template.fileUrl);
  if (objectPath) {
    await deleteObjectByPath(objectPath);
  }

  await prisma.complianceScheduleTemplate.delete({
    where: { id: params.id },
  });

  return ok("Compliance template deleted", { id: params.id });
}
