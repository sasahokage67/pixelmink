import { PrismaClient } from '@prisma/client';
import path from 'path';

import fs from 'fs';

declare global {
  var prisma: PrismaClient | undefined;
}

function getDatasourceUrl(): string {
  const rawUrl = process.env.DATABASE_URL?.trim();
  if (rawUrl && rawUrl.length > 0 && !rawUrl.startsWith('file:')) {
    return rawUrl;
  }

  // Detect serverless environment (Vercel / AWS Lambda)
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

  if (isServerless) {
    const tmpDbPath = '/tmp/dev.db';
    try {
      if (!fs.existsSync(tmpDbPath)) {
        const candidates = [
          path.join(process.cwd(), 'prisma', 'dev.db'),
          path.join(process.cwd(), 'dev.db'),
          path.resolve(__dirname, '..', '..', 'prisma', 'dev.db'),
        ];
        const found = candidates.find((p) => {
          try {
            return fs.existsSync(p);
          } catch {
            return false;
          }
        });

        if (found) {
          fs.copyFileSync(found, tmpDbPath);
        } else {
          fs.writeFileSync(tmpDbPath, '');
        }
      }
    } catch (err) {
      console.warn('Could not initialize /tmp/dev.db on serverless:', err);
    }
    return `file:${tmpDbPath}`;
  }

  return `file:${path.resolve(process.cwd(), 'prisma', 'dev.db')}`;
}

const dbUrl = getDatasourceUrl();

export const prisma =
  global.prisma ||
  new PrismaClient({
    datasources: {
      db: {
        url: dbUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;
