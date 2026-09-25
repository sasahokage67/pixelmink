import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userSkills: {
          include: { skill: true },
        },
        achievements: {
          include: { achievement: true },
        },
        reviewsReceived: {
          include: {
            reviewer: {
              include: { profile: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 30,
        },
        hostedSeminars: {
          take: 5,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Compute real statistics
    const [callsCount, calls, sessionsTaught, sessionsLearned] = await Promise.all([
      prisma.call.count({
        where: {
          OR: [{ callerId: userId }, { receiverId: userId }],
        },
      }),
      prisma.call.findMany({
        where: {
          OR: [{ callerId: userId }, { receiverId: userId }],
        },
        select: { duration: true, callerId: true, receiverId: true },
      }),
      prisma.session.findMany({
        where: { teacherId: userId },
        select: { studentId: true, duration: true },
      }),
      prisma.session.findMany({
        where: { studentId: userId },
        select: { teacherId: true, duration: true },
      }),
    ]);

    // Unique peers taught
    const taughtPeersSet = new Set<string>();
    sessionsTaught.forEach((s) => {
      if (s.studentId && s.studentId !== userId) taughtPeersSet.add(s.studentId);
    });
    calls.forEach((c) => {
      if (c.callerId === userId && c.receiverId && c.receiverId !== userId) {
        taughtPeersSet.add(c.receiverId);
      }
    });

    // Total session & call duration in hours
    const totalCallHours = calls.reduce((acc, c) => acc + (c.duration || 0), 0) / 3600;
    const taughtSessionHours = sessionsTaught.reduce((acc, s) => acc + (s.duration || 60), 0) / 60;
    const learnedSessionHours = sessionsLearned.reduce((acc, s) => acc + (s.duration || 60), 0) / 60;

    const baseTeachingHours = user.profile?.teachingHours ?? 0;
    const baseLearningHours = user.profile?.learningHours ?? 0;

    const teachingHoursTotal = parseFloat((baseTeachingHours + taughtSessionHours).toFixed(1));
    const learningHoursTotal = parseFloat((baseLearningHours + learnedSessionHours).toFixed(1));
    const totalHours = parseFloat((teachingHoursTotal + learningHoursTotal + totalCallHours).toFixed(1));

    const stats = {
      callsCount,
      totalHours,
      peersTaught: taughtPeersSet.size,
      teachingHours: teachingHoursTotal,
      learningHours: learningHoursTotal,
      xCredits: user.profile?.xCredits ?? 5,
      rating: user.profile?.rating ?? 5.0,
      reviewsCount: user.reviewsReceived?.length || user.profile?.reviewsCount || 0,
    };

    return NextResponse.json({ success: true, user, stats });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
