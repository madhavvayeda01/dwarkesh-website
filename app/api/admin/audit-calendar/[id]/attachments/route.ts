import { AuditActorType } from "@prisma/client";
import { fail, ok } from "@/lib/api-response";
import { requireAdminPage } from "@/lib/auth-guards";
import { safeAuditFilePart } from "@/lib/audit-calendar";
import { prisma } from "@/lib/prisma";
import { ensureStorageConfigured, uploadBufferToSupabase } from "@/lib/storage";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(req: Request, context: RouteContext) {
  const { error, session } = await requireAdminPage("audit_calendar");
  if (error || !session) return error;

  const storageError = ensureStorageConfigured();
  if (storageError) return storageError;

  const { id } = await context.params;
  const formData = await req.formData();
  const file = formData.get("file");
  const visitIdRaw = String(formData.get("visitId") || "").trim();
  const visitId = visitIdRaw || null;

  if (!(file instanceof File)) {
    return fail("file is required", 400);
  }

  const schedule = await prisma.auditSchedule.findUnique({
    where: { id },
    select: {
      id: true,
      clientId: true,
    },
  });
  if (!schedule) return fail("Audit schedule not found.", 404);

  if (visitId) {
    const visit = await prisma.auditVisit.findFirst({
      where: {
        id: visitId,
        auditScheduleId: id,
      },
      select: { id: true },
    });
    if (!visit) return fail("Visit not found for this audit schedule.", 404);
  }

  const folderPath = visitId
    ? `audit-calendar/${safeAuditFilePart(schedule.clientId)}/${safeAuditFilePart(id)}/visits/${safeAuditFilePart(visitId)}`
    : `audit-calendar/${safeAuditFilePart(schedule.clientId)}/${safeAuditFilePart(id)}`;
  const filePath = `${folderPath}/${Date.now()}_${safeAuditFilePart(file.name)}`;
  const uploaded = await uploadBufferToSupabase(
    Buffer.from(await file.arrayBuffer()),
    filePath,
    file.type || "application/octet-stream"
  );
  if (!uploaded.ok) return fail(uploaded.error, 500);

  const attachment = await prisma.auditAttachment.create({
    data: {
      auditScheduleId: id,
      visitId,
      fileName: file.name,
      fileUrl: uploaded.fileUrl,
      filePath,
      uploadedByAdminType:
        session.adminType === "consultant" ? AuditActorType.CONSULTANT : AuditActorType.ENV_ADMIN,
      uploadedByConsultantId: session.adminType === "consultant" ? session.adminId || null : null,
    },
  });

  return ok(
    "Attachment uploaded",
    {
      attachment: {
        id: attachment.id,
        auditScheduleId: attachment.auditScheduleId,
        visitId: attachment.visitId,
        fileName: attachment.fileName,
        fileUrl: attachment.fileUrl,
        createdAt: attachment.createdAt.toISOString(),
      },
    },
    201
  );
}
