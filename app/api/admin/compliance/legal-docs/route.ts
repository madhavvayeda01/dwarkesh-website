import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import {
  formatDateForInput,
  normalizeOptionalString,
  parseDateInput,
} from "@/lib/compliance-legal-docs";

const querySchema = z.object({
  clientId: z.string().trim().min(1),
});

const createSchema = z.object({
  clientId: z.string().trim().min(1),
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

export async function GET(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    clientId: url.searchParams.get("clientId") || "",
  });
  if (!parsed.success) return fail("Client is required", 400, parsed.error.flatten());

  const documents = await prisma.complianceLegalDocument.findMany({
    where: { clientId: parsed.data.clientId },
    orderBy: [{ expiryDate: "asc" }, { name: "asc" }],
  });

  return ok("Compliance legal docs fetched", {
    documents: documents.map(toDocumentPayload),
  });
}

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return fail("Invalid legal doc payload", 400, parsed.error.flatten());

  const issueDate = parseDateInput(parsed.data.issueDate);
  const expiryDate = parseDateInput(parsed.data.expiryDate);
  if (!expiryDate) {
    return fail("Expiry date is required", 400);
  }

  const document = await prisma.complianceLegalDocument.create({
    data: {
      clientId: parsed.data.clientId,
      name: parsed.data.name,
      issueDate,
      expiryDate,
      remarks: normalizeOptionalString(parsed.data.remarks),
    },
  });

  return ok("Compliance legal doc created", { document: toDocumentPayload(document) }, 201);
}
