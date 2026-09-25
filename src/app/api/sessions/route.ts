import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    let userId = user?.id;
    if (!userId) {
      const demo = await prisma.user.findFirst({ where: { email: 'alex@xchange.dev' } });
      userId = demo?.id;
    }

    const sessions = await prisma.session.findMany({
      where: {
        OR: [{ teacherId: userId }, { studentId: userId }],
      },
      include: {
        teacher: { include: { profile: true } },
        student: { include: { profile: true } },
        skill: true,
      },
      orderBy: { scheduledAt: 'asc' },
    });

    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    let studentId = user?.id;
    if (!studentId) {
      const demo = await prisma.user.findFirst({ where: { email: 'alex@xchange.dev' } });
      studentId = demo?.id;
    }

    const body = await req.json();
    const { teacherId, skillId, title, scheduledAt, duration = 60, format = 'VIDEO', notes = '' } = body;

    if (!teacherId || !skillId || !scheduledAt) {
      return NextResponse.json({ error: 'Missing required session parameters' }, { status: 400 });
    }

    const meetingLink = `call_room_${Math.random().toString(36).substring(2, 9)}`;

    const session = await prisma.session.create({
      data: {
        teacherId,
        studentId,
        skillId,
        title: title || '1-on-1 Knowledge Exchange Session',
        scheduledAt: new Date(scheduledAt),
        duration: parseInt(duration, 10),
        format,
        status: 'PENDING',
        notes,
        meetingLink,
      },
      include: {
        teacher: { include: { profile: true } },
        student: { include: { profile: true } },
        skill: true,
      },
    });

    // Notify teacher
    await prisma.notification.create({
      data: {
        userId: teacherId,
        type: 'SESSION',
        title: 'New Session Request',
        message: `${user?.profile?.name || 'A developer'} requested a ${duration}m ${format} exchange session with you!`,
        link: '/calendar',
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    console.error('Session create error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, status } = body;

    const session = await prisma.session.update({
      where: { id: sessionId },
      data: { status },
      include: {
        teacher: { include: { profile: true } },
        student: { include: { profile: true } },
        skill: true,
      },
    });

    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
