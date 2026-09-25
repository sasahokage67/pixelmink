import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    let reporterId = user?.id;
    if (!reporterId) {
      const demo = await prisma.user.findFirst({ where: { email: 'alex@xchange.dev' } });
      reporterId = demo?.id;
    }

    const body = await req.json();
    const { reportedUserId, reason, description } = body;

    if (!reportedUserId || !reason) {
      return NextResponse.json({ error: 'Missing reportedUserId or reason' }, { status: 400 });
    }

    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedUserId,
        reason,
        description: description || '',
        status: 'PENDING',
      },
    });

    return NextResponse.json({ success: true, report });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
