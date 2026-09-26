import { PrismaClient } from '@prisma/client';
import path from 'path';

declare global {
  var prisma: PrismaClient | undefined;
}

function getDatasourceUrl(): string {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (rawUrl && rawUrl.length > 0) {
    return rawUrl;
  }
  // Safe default for SQLite if DATABASE_URL is unset or empty string in environment
  return `file:${path.resolve(process.cwd(), 'prisma', 'dev.db')}`;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: getDatasourceUrl(),
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
