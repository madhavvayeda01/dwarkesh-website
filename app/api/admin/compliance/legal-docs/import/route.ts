import * as XLSX from "xlsx";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { normalizeOptionalString, parseDateInput } from "@/lib/compliance-legal-docs";

const importSchema = z.object({
  clientId: z.string().trim().min(1),
});

type ImportRow = {
  "Document Name"?: unknown;
  "Issue Date"?: unknown;
  "Expiry Date"?: unknown;
  Remarks?: unknown;
};

export async function POST(req: Request) {
  const { error } = await requireAdmin();
  if (error) return error;

  try {
    const formData = await req.formData();
    const parsed = importSchema.safeParse({
      clientId: String(formData.get("clientId") || ""),
    });
    if (!parsed.success) return fail("Client is required", 400, parsed.error.flatten());

    const file = formData.get("file");
    if (!(file instanceof File)) {
      return fail("Excel file is required", 400);
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(bytes, { type: "buffer" });
    const firstSheet = workbook.SheetNames[0];
    if (!firstSheet) return fail("Excel sheet is empty", 400);

    const worksheet = workbook.Sheets[firstSheet];
    const rows = XLSX.utils.sheet_to_json<ImportRow>(worksheet, { defval: "" });
    if (rows.length === 0) return fail("No rows found in import file", 400);

    const documents = rows
      .map((row) => {
        const name = String(row["Document Name"] || "").trim();
        const expiryDate = parseDateInput(row["Expiry Date"]);
        if (!name || !expiryDate) return null;

        return {
          clientId: parsed.data.clientId,
          name,
          issueDate: parseDateInput(row["Issue Date"]),
          expiryDate,
          remarks: normalizeOptionalString(row.Remarks),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    if (documents.length === 0) {
      return fail("No valid legal document rows found. Required columns: Document Name, Expiry Date", 400);
    }

    const created = await prisma.$transaction(
      documents.map((document) => prisma.complianceLegalDocument.create({ data: document }))
    );

    return ok("Compliance legal docs imported", { importedCount: created.length }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to import legal docs";
    return fail(message, 500);
  }
}
