import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { ensureStorageConfigured, uploadToSupabase } from "@/lib/storage";

const querySchema = z.object({
  clientId: z.string().trim().optional(),
  category: z.enum(["TRAINING", "COMMITTEE"]).optional(),
});

const createSchema = z.object({
  clientId: z.string().trim().min(1),
  category: z.enum(["TRAINING", "COMMITTEE"]),
  title: z.string().trim().min(1),
});

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    clientId: url.searchParams.get("clientId") || undefined,
    category: url.searchParams.get("category") || undefined,
  });
  if (!parsed.success) return fail("Invalid query", 400, parsed.error.flatten());

  const templates = await prisma.complianceScheduleTemplate.findMany({
    where: {
      ...(parsed.data.clientId ? { clientId: parsed.data.clientId } : {}),
      ...(parsed.data.category ? { category: parsed.data.category } : {}),
    },
    include: {
      client: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return ok("Compliance templates fetched", { templates });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const storageError = ensureStorageConfigured();
  if (storageError) return storageError;

  const formData = await req.formData();
  const parsed = createSchema.safeParse({
    clientId: String(formData.get("clientId") || ""),
    category: String(formData.get("category") || ""),
    title: String(formData.get("title") || ""),
  });
  if (!parsed.success) {
    return fail("Invalid compliance template payload", 400, parsed.error.flatten());
  }

  const file = formData.get("file");
  if (!(file instanceof File)) return fail("Template file is required", 400);
  if (!file.name.toLowerCase().endsWith(".docx")) {
    return fail("Only .docx files are allowed", 400);
  }

  const folder =
    parsed.data.category === "TRAINING" ? "compliance-templates/trainings" : "compliance-templates/committees";
  const uploaded = await uploadToSupabase(file, folder);
  if (!uploaded.ok) return fail(uploaded.error, 500);

  const template = await prisma.complianceScheduleTemplate.create({
    data: {
      clientId: parsed.data.clientId,
      category: parsed.data.category,
      title: parsed.data.title,
      fileUrl: uploaded.fileUrl,
    },
  });

  return ok("Compliance template uploaded", { template }, 201);
}
