import { PrismaClient } from '@prisma/client';
import path from 'path';

declare global {
  var prisma: PrismaClient | undefined;
}

function getDatasourceUrl(): string | undefined {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (rawUrl && rawUrl.length > 0) {
    return rawUrl;
  }
  return undefined;
}

const dbUrl = getDatasourceUrl();

export const prisma =
  global.prisma ||
  (dbUrl
    ? new PrismaClient({ datasources: { db: { url: dbUrl } } })
    : new PrismaClient());

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
