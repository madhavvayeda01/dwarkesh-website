import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

function applyEnvLayer(fileName: string, currentLayer?: Record<string, string>) {
  const filePath = path.resolve(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return {};
  const parsed = dotenv.parse(fs.readFileSync(filePath));

  for (const [key, value] of Object.entries(parsed)) {
    if (process.env[key] === undefined || (currentLayer && process.env[key] === currentLayer[key])) {
      process.env[key] = value;
    }
  }

  return parsed;
}

function describeDatabaseTarget(rawUrl?: string) {
  if (!rawUrl) return "DATABASE_URL is not set";
  try {
    const parsed = new URL(rawUrl);
    const dbName = parsed.pathname.replace(/^\/+/, "") || "(default)";
    const port = parsed.port ? `:${parsed.port}` : "";
    return `${parsed.protocol}//${parsed.hostname}${port}/${dbName}`;
  } catch {
    return "DATABASE_URL is set but could not be parsed";
  }
}

// Precedence: shell env > .env.local > .env
const baseLayer = applyEnvLayer(".env");
const localLayer = applyEnvLayer(".env.local", baseLayer);

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not configured. Set it in shell, .env.local, or .env."
  );
}

if (process.env.NODE_ENV !== "production") {
  const source = localLayer.DATABASE_URL
    ? ".env.local"
    : baseLayer.DATABASE_URL
      ? ".env"
      : "shell";
  if (source !== ".env.local") {
    console.warn(
      `[prisma.config] Using DATABASE_URL from ${source}. Add DATABASE_URL to .env.local to avoid target drift.`
    );
  }
  console.info(
    `[prisma.config] Prisma datasource target: ${describeDatabaseTarget(databaseUrl)}`
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: databaseUrl,
    directUrl: process.env.DIRECT_URL,
  },
});
