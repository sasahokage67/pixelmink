import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const conversationId = params.id;
    const messages = await prisma.message.findMany({
      where: { conversationId },
      include: {
        sender: {
          include: { profile: true },
        },
        reactions: {
          include: {
            user: { include: { profile: true } },
          },
        },
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
    const conversationId = params.id;
    const user = await getSessionUser(req);
    let senderId = user?.id;
    if (!senderId) {
      const demo = await prisma.user.findFirst({ where: { email: 'alex@xchange.dev' } });
      senderId = demo?.id;
    }

    if (!senderId) {
      return NextResponse.json({ error: 'User required' }, { status: 401 });
    }

    const body = await req.json();
    const { content, messageType = 'TEXT', replyToId } = body;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    const message = await prisma.message.create({
      data: {
        conversationId,
        senderId,
        content,
        messageType,
        replyToId: replyToId || null,
        isRead: false,
      },
      include: {
        sender: {
          include: { profile: true },
        },
        reactions: true,
      },
    });

    // Update conversation updatedAt
    await prisma.conversation.update({
      where: { id: conversationId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    console.error('Error creating message:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
