import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const where: any = {};
    if (category && category !== 'ALL') {
      where.category = { contains: category };
    }
    if (status) {
      where.status = status;
    }

    const seminars = await prisma.seminar.findMany({
      where,
      include: {
        host: {
          include: { profile: true },
        },
        participants: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ success: true, seminars });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    let hostId = user?.id;
    if (!hostId) {
      const demo = await prisma.user.findFirst({ where: { email: 'alex@xchange.dev' } });
      hostId = demo?.id;
    }

    const body = await req.json();
    const { title, description, category = 'AI & CODING', level = 'All Levels', language = 'English', date, time, duration = 60, maxParticipants = 500 } = body;

    if (!title || !description || !date || !time) {
      return NextResponse.json({ error: 'Title, description, date and time are required' }, { status: 400 });
    }

    const seminar = await prisma.seminar.create({
      data: {
        hostId,
        title,
        description,
        category,
        level,
        language,
        date,
        time,
        duration: parseInt(duration, 10),
        maxParticipants: parseInt(maxParticipants, 10),
        participantCount: 1, // host
        status: 'UPCOMING',
        isLive: false,
      },
      include: {
        host: { include: { profile: true } },
      },
    });

    // Auto register host as certified participant
    await prisma.seminarParticipant.create({
      data: {
        seminarId: seminar.id,
        userId: hostId,
      },
    });

    return NextResponse.json({ success: true, seminar });
  } catch (err: any) {
    console.error('Error creating seminar:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
