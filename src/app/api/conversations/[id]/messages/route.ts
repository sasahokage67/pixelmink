import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isUserBlocked } from '@/lib/matchBlock';

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

    // Verify conversation members are not blocked
    const conv = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: { members: true },
    });
    if (conv && !conv.isGroup) {
      const otherMember = conv.members.find((m) => m.userId !== senderId);
      if (otherMember) {
        if (await isUserBlocked(senderId, otherMember.userId)) {
          return NextResponse.json({ error: 'Пользователь заблокирован' }, { status: 403 });
        }
      }
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
