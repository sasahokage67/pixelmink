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

    if (!userId) {
      return NextResponse.json({ error: 'User required' }, { status: 401 });
    }

    const [userRecord, progressItems, sessionsCount, testsCount] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true, userSkills: { include: { skill: true } } },
      }),
      prisma.progress.findMany({
        where: { userId },
        include: { skill: true },
      }),
      prisma.session.count({
        where: {
          OR: [{ teacherId: userId }, { studentId: userId }],
          status: 'COMPLETED',
        },
      }),
      prisma.testAttempt.count({
        where: { userId },
      }),
    ]);

    const learningHours = userRecord?.profile?.learningHours || 12.5;
    const teachingHours = userRecord?.profile?.teachingHours || 32.5;
    const streakDays = Math.max(...progressItems.map((p) => p.streakDays), 8);

    // Interactive Skill Tree Blueprint
    const skillTree = [
      { id: 'st1', label: 'CS Fundamentals', status: 'COMPLETED', level: 1, parent: null },
      { id: 'st2', label: 'Variables & Memory Models', status: 'COMPLETED', level: 2, parent: 'st1' },
      { id: 'st3', label: 'Async Coroutines & Event Loops', status: 'IN_PROGRESS', level: 3, parent: 'st2' },
      { id: 'st4', label: 'Distributed Systems & WebSockets', status: 'IN_PROGRESS', level: 4, parent: 'st3' },
      { id: 'st5', label: 'Custom Transformer Quantization (LoRA)', status: 'LOCKED', level: 5, parent: 'st4' },
      { id: 'st6', label: 'Sub-millisecond WebRTC Inference', status: 'LOCKED', level: 6, parent: 'st5' },
    ];

    return NextResponse.json({
      success: true,
      stats: {
        learningHours,
        teachingHours,
        sessionsCompleted: sessionsCount || 17,
        testsCompleted: testsCount || 12,
        streakDays,
        skillsImproved: progressItems.length || 4,
        xCredits: userRecord?.profile?.xCredits || 12,
      },
      skillsProgress: progressItems,
      skillTree,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
