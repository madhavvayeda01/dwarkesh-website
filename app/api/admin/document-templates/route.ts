import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const adminToken = cookieStore.get("admin_token")?.value;

if (adminToken !== "logged_in") {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}

    const templates = await prisma.documentTemplate.findMany({
      include: { group: true, client: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ ok: true, templates });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to fetch templates" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("admin_token")?.value;

if (token !== "logged_in") {
  return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
}


    const formData = await req.formData();

    const clientId = String(formData.get("clientId") || "");
    const groupName = String(formData.get("groupName") || "Personal File");
    const title = String(formData.get("title") || "");
    const file = formData.get("file") as File | null;

    if (!clientId || !title || !file) {
      return NextResponse.json(
        { ok: false, message: "clientId, title, file are required" },
        { status: 400 }
      );
    }

    if (!file.name.toLowerCase().endsWith(".docx")) {
      return NextResponse.json(
        { ok: false, message: "Only .docx files allowed" },
        { status: 400 }
      );
    }

    // Ensure group exists
    const group = await prisma.documentGroup.upsert({
      where: { name: groupName },
      update: {},
      create: { name: groupName },
    });

    // Save file to public/uploads/templates
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const safeTitle = title.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "_");
    const fileName = `${Date.now()}_${safeTitle}.docx`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "templates");
    await fs.mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, fileName);
    await fs.writeFile(filePath, buffer);

    const fileUrl = `/uploads/templates/${fileName}`;

    // Save DB record
    const template = await prisma.documentTemplate.create({
      data: {
        clientId,
        groupId: group.id,
        title,
        fileUrl,
      },
    });

    return NextResponse.json({ ok: true, template });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, message: err?.message || "Failed to upload template" },
      { status: 500 }
    );
  }
}
