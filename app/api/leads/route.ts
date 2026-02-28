import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { createLeadSchema } from "@/lib/validation/lead";
import { sendEnquiryNotification } from "@/lib/email/send-enquiry-notification";
import { getClientIp, rateLimitByIp } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const limit = rateLimitByIp(`lead:${ip}`, 5, 10 * 60 * 1000);

    if (!limit.allowed) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Too many enquiries were submitted from your connection. Please wait a few minutes and try again.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(limit.retryAfterSeconds),
          },
        }
      );
    }

    const parsed = createLeadSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          message: "Please correct the highlighted enquiry fields.",
          fieldErrors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { fullName, companyName, email, phone, message } = parsed.data;

    const lead = await prisma.lead.create({
      data: {
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        message: message.trim(),
      },
    });

    const emailResult = await sendEnquiryNotification({
      fullName: lead.fullName,
      companyName: lead.companyName || "",
      phone: lead.phone,
      email: lead.email || "",
      message: lead.message || "",
      createdAt: lead.createdAt,
    });

    if (!emailResult.ok) {
      logger.error("lead.email_notification.error", {
        leadId: lead.id,
        skipped: emailResult.skipped,
        error: emailResult.error,
      });
    }

    logger.info("lead.create.success", { leadId: lead.id, phone });
    return NextResponse.json(
      {
        ok: true,
        message: emailResult.ok
          ? "Enquiry submitted successfully."
          : "Enquiry submitted successfully. Email notification is temporarily delayed.",
        lead: {
          id: lead.id,
          fullName: lead.fullName,
          companyName: lead.companyName,
          email: lead.email,
          phone: lead.phone,
          message: lead.message,
          createdAt: lead.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("lead.create.error", { message });
    return NextResponse.json(
      {
        ok: false,
        message:
          "We could not submit your enquiry right now. Please try again in a moment or contact support directly.",
      },
      { status: 500 }
    );
  }
}
