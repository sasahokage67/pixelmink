import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const seminarId = params.id;
    const messages = await prisma.seminarMessage.findMany({
      where: { seminarId },
      include: {
        user: { include: { profile: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json({ success: true, messages });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const seminarId = params.id;
    const user = await getSessionUser(req);
    let userId = user?.id;
    if (!userId) {
      const demo = await prisma.user.findFirst({ where: { email: 'alex@xchange.dev' } });
      userId = demo?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'User required' }, { status: 401 });
    }

    const body = await req.json();
    const { content, isPinned = false, isModerator = false } = body;

    const message = await prisma.seminarMessage.create({
      data: {
        seminarId,
        userId,
        content,
        isPinned,
        isModerator,
      },
      include: {
        user: { include: { profile: true } },
      },
    });

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
