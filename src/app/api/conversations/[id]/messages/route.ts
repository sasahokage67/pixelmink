import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isUserBlocked } from '@/lib/matchBlock';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const conversationId = params.id;
    const conversation = await prisma.conversation.findFirst({
      where: { id: conversationId, members: { some: { userId: user.id } } },
      select: { id: true },
    });
    if (!conversation) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
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
    const body = await req.json();
    const { content, messageType = 'TEXT', replyToId, clientMessageId } = body;

    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const senderId = user.id;

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Message content cannot be empty' }, { status: 400 });
    }

    const conv = await prisma.conversation.findFirst({
      where: { id: conversationId, members: { some: { userId: senderId } } },
      include: { members: true },
    });
    if (!conv) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    if (!conv.isGroup && conv.members.length !== 2) {
      return NextResponse.json({ error: 'Conversation has no participant' }, { status: 409 });
    }

    // Verify conversation members are not blocked
    if (conv && !conv.isGroup) {
      const otherMember = conv.members?.find((m) => m.userId !== senderId);
      if (otherMember) {
        if (await isUserBlocked(senderId, otherMember.userId)) {
          return NextResponse.json({ error: 'Пользователь заблокирован' }, { status: 403 });
        }
      }
    }

    const requestedId = typeof clientMessageId === 'string' && /^[a-zA-Z0-9_-]{8,64}$/.test(clientMessageId)
      ? clientMessageId
      : undefined;

    if (requestedId) {
      const existingMessage = await prisma.message.findUnique({
        where: { id: requestedId },
        include: {
          sender: { include: { profile: true } },
          reactions: true,
        },
      });
      if (existingMessage) {
        if (existingMessage.conversationId !== conversationId || existingMessage.senderId !== senderId) {
          return NextResponse.json({ error: 'Message id conflict' }, { status: 409 });
        }
        return NextResponse.json({ success: true, message: existingMessage });
      }
    }

    const message = await prisma.message.create({
      data: {
        ...(requestedId ? { id: requestedId } : {}),
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

    // Instant real-time broadcast to conversation topic & member channels
    try {
      fetch(`https://ntfy.sh/pixelmink_conv_${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'new_message',
          conversationId,
          message,
        }),
      }).catch(() => {});

      if (conv?.members) {
        for (const member of conv.members) {
          if (member.userId !== senderId) {
            fetch(`https://ntfy.sh/pixelmink_user_${member.userId}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                type: 'new_chat_message',
                conversationId,
                message,
              }),
            }).catch(() => {});
          }
        }
      }
    } catch {}

    return NextResponse.json({ success: true, message });
  } catch (err: any) {
    console.error('Error creating message:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
