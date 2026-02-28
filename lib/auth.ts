import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

type Role = "admin" | "client";

export type SessionPayload = {
  sub: string;
  role: Role;
  clientId?: string;
  impersonatedByAdmin?: boolean;
  adminId?: string;
  adminType?: "env_admin" | "consultant";
  adminName?: string;
  adminEmail?: string;
  exp: number;
};

const COOKIE_NAME = "session_token";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function b64urlJson(value: object) {
  return b64url(Buffer.from(JSON.stringify(value)));
}

function fromB64url(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Buffer.from(padded, "base64");
}

function getSecret() {
  const secret = process.env.JWT_SECRET || process.env.ADMIN_PASSWORD;
  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") {
    return "dev-secret";
  }

  throw new Error("JWT_SECRET or ADMIN_PASSWORD must be configured for session signing.");
}

export function signJwt(payload: Omit<SessionPayload, "exp">) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body: SessionPayload = { ...payload, exp: now + MAX_AGE_SECONDS };
  const encoded = `${b64urlJson(header)}.${b64urlJson(body)}`;
  const sig = createHmac("sha256", getSecret()).update(encoded).digest();
  return `${encoded}.${b64url(sig)}`;
}

export function verifyJwt(token?: string): SessionPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, s] = parts;
  const expected = createHmac("sha256", getSecret()).update(`${h}.${p}`).digest();
  const received = fromB64url(s);
  if (expected.length !== received.length) return null;
  if (!timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(fromB64url(p).toString("utf8")) as SessionPayload;
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromCookies() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  return verifyJwt(token);
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
  // cleanup old cookies from prior auth system
  store.delete("admin_token");
  store.delete("client_token");
  store.delete("client_id");
  store.delete("admin_session");
}

export function getCookieName() {
  return COOKIE_NAME;
}
