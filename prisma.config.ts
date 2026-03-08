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

// Precedence: shell env > .env.local > .env
const baseLayer = applyEnvLayer(".env");
applyEnvLayer(".env.local", baseLayer);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL!,
    directUrl: process.env.DIRECT_URL,
  },
});
