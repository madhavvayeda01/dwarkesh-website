import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";

export async function GET() {
  const cookieStore = await cookies();

  const token = cookieStore.get("client_token")?.value;
  const clientId = cookieStore.get("client_id")?.value;

  // must be logged in AND must have client id
  if (token !== "logged_in" || !clientId) {
    return NextResponse.json({ loggedIn: false });
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
    },
  });

  if (!client) {
    return NextResponse.json({ loggedIn: false });
  }

  return NextResponse.json({
    loggedIn: true,
    client,
  });
}
