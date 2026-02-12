import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { fullName, companyName, email, phone, message } = body;

    if (!fullName || !phone) {
      return NextResponse.json(
        { error: "Full Name and Phone are required." },
        { status: 400 }
      );
    }

    const lead = await prisma.lead.create({
      data: {
        fullName,
        companyName: companyName || null,
        email: email || null,
        phone,
        message: message || null,
      },
    });

    return NextResponse.json({ success: true, lead }, { status: 201 });
  } catch (error) {
    console.log("API ERROR:", error);
    return NextResponse.json(
      { error: "Something went wrong while saving lead." },
      { status: 500 }
    );
  }
}
