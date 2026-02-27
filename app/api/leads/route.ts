import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { fail, ok } from "@/lib/api-response";
import { logger } from "@/lib/logger";

const createLeadSchema = z.object({
  fullName: z.string().trim().min(1),
  companyName: z.string().trim().optional().or(z.literal("")),
  email: z.string().trim().email().optional().or(z.literal("")),
  phone: z.string().trim().min(1),
  message: z.string().trim().optional().or(z.literal("")),
});

export async function POST(req: Request) {
  try {
    const parsed = createLeadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return fail("Full Name and Phone are required.", 400, parsed.error.flatten());
    }

    const { fullName, companyName, email, phone, message } = parsed.data;

    const lead = await prisma.lead.create({
      data: {
        fullName,
        companyName: companyName || null,
        email: email || null,
        phone,
        message: message || null,
      },
    });

    logger.info("lead.create.success", { leadId: lead.id, phone });
    return ok("Lead created", { lead }, 201);
  } catch (err: any) {
    logger.error("lead.create.error", { message: err?.message });
    return fail("Something went wrong while saving lead.", 500);
  }
}
