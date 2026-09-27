import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const conversationId = params.id;
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, members: { some: { userId: user.id } } },
      include: {
        members: {
          include: {
            user: {
              include: { profile: true },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }
    if (!conversation.isGroup && conversation.members.length !== 2) {
      return NextResponse.json({ error: 'Conversation has no participant' }, { status: 409 });
    }

    return NextResponse.json({ success: true, conversation });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
