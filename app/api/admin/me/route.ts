import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
  const token = (await cookies()).get("admin_token")?.value;

  return NextResponse.json({
    loggedIn: token === "logged_in",
    admin: token ? "admin" : null,
  });
}
