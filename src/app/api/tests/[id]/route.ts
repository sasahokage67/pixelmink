import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const testId = params.id;
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        skill: true,
        questions: true,
      },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, test });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const testId = params.id;
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
    const { answers } = body; // map of { questionId: "A"|"B"|"C"|"D" }

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { questions: true, skill: true },
    });

    if (!test) {
      return NextResponse.json({ error: 'Test not found' }, { status: 404 });
    }

    let correctCount = 0;
    const totalQuestions = test.questions.length;
    const reviewBreakdown = test.questions.map((q) => {
      const selected = answers[q.id];
      const isCorrect = selected === q.correctOption;
      if (isCorrect) correctCount++;
      return {
        questionId: q.id,
        question: q.question,
        selectedOption: selected,
        correctOption: q.correctOption,
        isCorrect,
        explanation: q.explanation,
      };
    });

    const passed = correctCount >= Math.ceil(totalQuestions * 0.6);

    // Save attempt
    const attempt = await prisma.testAttempt.create({
      data: {
        testId: test.id,
        userId,
        score: correctCount,
        maxScore: totalQuestions,
        passed,
      },
    });

    // Update skill progress (+8%)
    const progressGain = passed ? 8 : 2;
    const userProgress = await prisma.progress.upsert({
      where: {
        userId_skillId: {
          userId,
          skillId: test.skillId,
        },
      },
      update: {
        progressPercent: { increment: progressGain },
        streakDays: { increment: 1 },
      },
      create: {
        userId,
        skillId: test.skillId,
        progressPercent: progressGain,
        hoursSpent: 1.0,
        streakDays: 1,
      },
    });

    // Create Notification
    await prisma.notification.create({
      data: {
        userId,
        type: 'TEST',
        title: `Test Completed: ${test.title}`,
        message: `Score: ${correctCount}/${totalQuestions}. Knowledge progress +${progressGain}%.`,
        link: '/progress',
      },
    });

    return NextResponse.json({
      success: true,
      score: correctCount,
      maxScore: totalQuestions,
      passed,
      progressGain,
      newProgressPercent: userProgress.progressPercent,
      breakdown: reviewBreakdown,
      attemptId: attempt.id,
    });
  } catch (err: any) {
    console.error('Test grading error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
