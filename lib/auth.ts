import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { isMissingColumnError } from "@/lib/prisma-compat";

type Role = "admin" | "client";

export type SessionPayload = {
  sub: string;
  role: Role;
  clientId?: string;
  sessionVersion?: number;
  impersonatedByAdmin?: boolean;
  adminId?: string;
  adminType?: "env_admin" | "consultant";
  adminName?: string;
  adminEmail?: string;
  exp: number;
};

const COOKIE_NAME = "session_token";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const REMEMBER_ME_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days
let clientSessionVersionColumnExists: boolean | null = null;
let consultantSessionVersionColumnExists: boolean | null = null;

type SessionCookieOptions = {
  persistent?: boolean;
  maxAgeSeconds?: number;
};

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

async function checkColumnExists(
  prisma: { $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T> },
  tableName: string,
  columnName: string
) {
  const result = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    ) AS "exists"
  `;
  return Boolean(result?.[0]?.exists);
}

async function clientSessionVersionSupported(
  prisma: { $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T> }
) {
  if (clientSessionVersionColumnExists !== null) return clientSessionVersionColumnExists;
  try {
    clientSessionVersionColumnExists = await checkColumnExists(prisma, "Client", "sessionVersion");
  } catch {
    clientSessionVersionColumnExists = true;
  }
  return clientSessionVersionColumnExists;
}

async function consultantSessionVersionSupported(
  prisma: { $queryRaw: <T = unknown>(query: TemplateStringsArray, ...values: unknown[]) => Promise<T> }
) {
  if (consultantSessionVersionColumnExists !== null) return consultantSessionVersionColumnExists;
  try {
    consultantSessionVersionColumnExists = await checkColumnExists(
      prisma,
      "Consultant",
      "sessionVersion"
    );
  } catch {
    consultantSessionVersionColumnExists = true;
  }
  return consultantSessionVersionColumnExists;
}

export function signJwt(
  payload: Omit<SessionPayload, "exp">,
  ttlSeconds: number = DEFAULT_MAX_AGE_SECONDS
) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "HS256", typ: "JWT" };
  const body: SessionPayload = { ...payload, exp: now + ttlSeconds };
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
  const payload = verifyJwt(token);
  if (!payload) return null;

  if (payload.role === "client" && payload.clientId) {
    const { prisma } = await import("@/lib/prisma");
    const supportsSessionVersion = await clientSessionVersionSupported(prisma);

    if (supportsSessionVersion) {
      try {
        const client = await prisma.client.findUnique({
          where: { id: payload.clientId },
          select: { sessionVersion: true },
        });
        if (!client) return null;
        if (client.sessionVersion !== (payload.sessionVersion ?? 1)) return null;
        return payload;
      } catch (error) {
        if (!isMissingColumnError(error, "Client", "sessionVersion")) {
          throw error;
        }
        clientSessionVersionColumnExists = false;
      }
    }

    const client = await prisma.client.findUnique({
      where: { id: payload.clientId },
      select: { id: true },
    });
    return client ? payload : null;
  }

  if (payload.role === "admin" && payload.adminType === "consultant" && payload.adminId) {
    const { prisma } = await import("@/lib/prisma");
    const supportsSessionVersion = await consultantSessionVersionSupported(prisma);

    if (supportsSessionVersion) {
      try {
        const consultant = await prisma.consultant.findUnique({
          where: { id: payload.adminId },
          select: { active: true, sessionVersion: true },
        });
        if (!consultant?.active) return null;
        if (consultant.sessionVersion !== (payload.sessionVersion ?? 1)) return null;
        return payload;
      } catch (error) {
        if (!isMissingColumnError(error, "Consultant", "sessionVersion")) {
          throw error;
        }
        consultantSessionVersionColumnExists = false;
      }
    }

    const consultant = await prisma.consultant.findUnique({
      where: { id: payload.adminId },
      select: { active: true },
    });
    return consultant?.active ? payload : null;
  }

  return payload;
}

export function setSessionCookie(
  response: NextResponse,
  token: string,
  options?: SessionCookieOptions
) {
  const persistent = options?.persistent ?? true;
  const maxAgeSeconds = options?.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;

  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    ...(persistent ? { maxAge: maxAgeSeconds } : {}),
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
