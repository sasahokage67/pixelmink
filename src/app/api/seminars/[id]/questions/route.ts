import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const seminarId = params.id;
    const questions = await prisma.seminarQuestion.findMany({
      where: { seminarId },
      include: {
        user: { include: { profile: true } },
      },
      orderBy: [
        { isAnsweringNow: 'desc' },
        { upvotes: 'desc' },
        { createdAt: 'desc' },
      ],
    });
    return NextResponse.json({ success: true, questions });
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

    const body = await req.json();
    const { question } = body;

    if (!question || !question.trim()) {
      return NextResponse.json({ error: 'Question cannot be empty' }, { status: 400 });
    }

    const item = await prisma.seminarQuestion.create({
      data: {
        seminarId,
        userId,
        question: question.trim(),
        upvotes: 1,
      },
      include: {
        user: { include: { profile: true } },
      },
    });

    return NextResponse.json({ success: true, question: item });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { questionId, action } = body;

    if (action === 'upvote') {
      const updated = await prisma.seminarQuestion.update({
        where: { id: questionId },
        data: { upvotes: { increment: 1 } },
        include: { user: { include: { profile: true } } },
      });
      return NextResponse.json({ success: true, question: updated });
    }

    if (action === 'toggle_answering') {
      const q = await prisma.seminarQuestion.findUnique({ where: { id: questionId } });
      if (!q) return NextResponse.json({ error: 'Not found' }, { status: 404 });

      const updated = await prisma.seminarQuestion.update({
        where: { id: questionId },
        data: { isAnsweringNow: !q.isAnsweringNow },
        include: { user: { include: { profile: true } } },
      });
      return NextResponse.json({ success: true, question: updated });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
