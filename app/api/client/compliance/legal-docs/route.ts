import { ok } from "@/lib/api-response";
import { requireClientPage } from "@/lib/auth-guards";
import type { ComplianceDocumentStatusValue } from "@/lib/compliance-legal-docs";
import { prisma } from "@/lib/prisma";
import { syncComplianceDocumentNotifications } from "@/lib/compliance-notifications";

function toStatus(
  documentStatus: ComplianceDocumentStatusValue,
  expiryDate: Date | null
) {
  if (documentStatus === "NOT_APPLICABLE") {
    return { label: "Not Applicable", tone: "neutral", days: null };
  }

  if (documentStatus === "NOT_AVAILABLE") {
    return { label: "Not Available", tone: "neutral", days: null };
  }

  if (!expiryDate) {
    return { label: "Not Available", tone: "neutral", days: null };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(expiryDate);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((target.getTime() - today.getTime()) / 86400000);

  if (diffDays < 0) return { label: "Expired", tone: "expired", days: diffDays };
  if (diffDays <= 7) return { label: "Expiring Soon", tone: "warning", days: diffDays };
  if (diffDays <= 30) return { label: "Due This Month", tone: "warning", days: diffDays };
  return { label: "Active", tone: "active", days: diffDays };
}

export async function GET() {
  const { error, session } = await requireClientPage("compliance_legal_docs");
  if (error || !session) return error;

  await syncComplianceDocumentNotifications(session.clientId);

  const documents = await prisma.complianceLegalDocument.findMany({
    where: { clientId: session.clientId },
    orderBy: [{ expiryDate: "asc" }, { name: "asc" }],
  });

  return ok("Compliance legal docs fetched", {
    documents: documents.map((doc) => ({
      ...doc,
      status: toStatus(doc.documentStatus, doc.expiryDate),
    })),
  });
}
