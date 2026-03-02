import * as XLSX from "xlsx";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { formatDateForInput } from "@/lib/compliance-legal-docs";

const querySchema = z.object({
  clientId: z.string().trim().min(1),
});

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

  const rows = documents.map((document) => ({
    "Document Name": document.name,
    "Issue Date": formatDateForInput(document.issueDate),
    "Expiry Date": formatDateForInput(document.expiryDate),
    Remarks: document.remarks || "",
  }));

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Legal Docs");
  const bytes = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer;

  return new Response(Uint8Array.from(bytes), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        `attachment; filename="compliance_legal_docs_${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  });
}
