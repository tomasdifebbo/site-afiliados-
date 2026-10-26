import { PrismaClient } from "@prisma/client";
import path from "path";
import fs from "fs";

function getDatabaseUrl(): string {
  // Se for Postgres / Supabase / Turso externo, usa direto
  if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith("file:")) {
    return process.env.DATABASE_URL;
  }

  // Se não estiver na Vercel (desenvolvimento ou build local), usa o arquivo local normal
  if (!process.env.VERCEL) {
    return `file:${path.join(process.cwd(), "prisma", "dev.db")}`;
  }

  // No Vercel / serverless Linux, o diretório de execução é somente-leitura.
  // Copiamos dev.db para /tmp/dev.db para habilitar leitura e escrita rápidas com SQLite!
  const tmpDbPath = path.join("/tmp", "dev.db");
  const sourceDbPath = path.join(process.cwd(), "prisma", "dev.db");

  if (!fs.existsSync(tmpDbPath) && fs.existsSync(sourceDbPath)) {
    try {
      fs.copyFileSync(sourceDbPath, tmpDbPath);
    } catch (err) {
      console.warn("Falha ao copiar dev.db para /tmp:", err);
    }
  }

  const finalPath = fs.existsSync(tmpDbPath) ? tmpDbPath : sourceDbPath;
  return `file:${finalPath}`;
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
