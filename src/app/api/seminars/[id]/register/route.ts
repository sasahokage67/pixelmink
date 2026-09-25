import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const seminar = await prisma.seminar.findUnique({
      where: { id: seminarId },
    });

    if (!seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    // Check if already registered
    const existing = await prisma.seminarParticipant.findUnique({
      where: {
        seminarId_userId: {
          seminarId,
          userId,
        },
      },
    });

    if (existing) {
      return NextResponse.json({
        success: true,
        registered: true,
        message: "You're already registered for this seminar",
      });
    }

    if (seminar.participantCount >= seminar.maxParticipants) {
      return NextResponse.json({ error: 'Seminar is already full' }, { status: 400 });
    }

    // Register
    await prisma.seminarParticipant.create({
      data: {
        seminarId,
        userId,
      },
    });

    // Increment count
    await prisma.seminar.update({
      where: { id: seminarId },
      data: {
        participantCount: { increment: 1 },
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'SEMINAR',
        title: "✅ You're registered!",
        message: `Seat confirmed for "${seminar.title}" on ${seminar.date} at ${seminar.time}.`,
        link: `/seminars/${seminar.id}/live`,
      },
    });

    return NextResponse.json({
      success: true,
      registered: true,
      message: "You're successfully registered!",
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
