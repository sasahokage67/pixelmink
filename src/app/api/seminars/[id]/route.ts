import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const seminarId = params.id;
    const user = await getSessionUser(req);

    const seminar = await prisma.seminar.findUnique({
      where: { id: seminarId },
      include: {
        host: {
          include: { profile: true },
        },
        participants: {
          include: {
            user: { include: { profile: true } },
          },
        },
        recordings: true,
      },
    });

    if (!seminar) {
      return NextResponse.json({ error: 'Seminar not found' }, { status: 404 });
    }

    const isRegistered = user
      ? seminar.participants.some((p) => p.userId === user.id)
      : false;

    return NextResponse.json({
      success: true,
      seminar,
      isRegistered,
      currentUserId: user?.id,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
