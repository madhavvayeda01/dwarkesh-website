import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { ensureStorageConfigured, uploadToSupabase } from "@/lib/storage";
import { logger } from "@/lib/logger";

const uploadSchema = z.object({
  clientId: z.string().trim().min(1),
  groupName: z.string().trim().min(1).default("Personal File"),
  title: z.string().trim().min(1),
});

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const templates = await prisma.documentTemplate.findMany({
      include: { group: true, client: true },
      orderBy: { createdAt: "desc" },
    });
    return ok("Templates fetched", { templates });
  } catch (err: any) {
    return fail(err?.message || "Failed to fetch templates", 500);
  }
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const storageError = ensureStorageConfigured();
  if (storageError) return storageError;

  try {
    const formData = await req.formData();
    const payload = uploadSchema.safeParse({
      clientId: String(formData.get("clientId") || ""),
      groupName: String(formData.get("groupName") || "Personal File"),
      title: String(formData.get("title") || ""),
    });
    if (!payload.success) {
      return fail("Invalid template payload", 400, payload.error.flatten());
    }

    const file = formData.get("file") as File | null;
    if (!file) return fail("file is required", 400);
    if (!file.name.toLowerCase().endsWith(".docx")) {
      return fail("Only .docx files allowed", 400);
    }

    const uploaded = await uploadToSupabase(file, "templates");
    if (!uploaded.ok) return fail(uploaded.error, 500);

    const group = await prisma.documentGroup.upsert({
      where: { name: payload.data.groupName },
      update: {},
      create: { name: payload.data.groupName },
    });

    const template = await prisma.documentTemplate.create({
      data: {
        clientId: payload.data.clientId,
        groupId: group.id,
        title: payload.data.title,
        fileUrl: uploaded.fileUrl,
      },
    });

    logger.info("admin.template.upload.success", { templateId: template.id });
    return ok("Template uploaded", { template }, 201);
  } catch (err: any) {
    logger.error("admin.template.upload.error", { message: err?.message });
    return fail(err?.message || "Failed to upload template", 500);
  }
}
