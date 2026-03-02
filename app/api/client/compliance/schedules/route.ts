import { z } from "zod";
import { ok, fail } from "@/lib/api-response";
import { requireClientPage } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  category: z.enum(["TRAINING", "COMMITTEE"]),
});

function pageKeyForCategory(category: "TRAINING" | "COMMITTEE") {
  return category === "TRAINING" ? "compliance_trainings" : "compliance_committee_meetings";
}

function toDateLabel(value: Date) {
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    category: url.searchParams.get("category") || "",
  });
  if (!parsed.success) {
    return fail("Invalid query", 400, parsed.error.flatten());
  }

  const pageKey = pageKeyForCategory(parsed.data.category);
  const { error, session } = await requireClientPage(pageKey);
  if (error || !session) return error;

  const events = await prisma.complianceScheduleEvent.findMany({
    where: {
      clientId: session.clientId,
      category: parsed.data.category,
    },
    orderBy: { scheduledFor: "asc" },
  });

  return ok("Compliance schedule fetched", {
    events: events.map((event) => ({
      ...event,
      scheduledLabel: toDateLabel(event.scheduledFor),
    })),
  });
}
