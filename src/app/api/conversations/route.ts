import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    // Fallback to Alex for seamless demo experience
    let currentUserId = user?.id;
    if (!currentUserId) {
      const demo = await prisma.user.findFirst({ where: { email: 'alex@xchange.dev' } });
      currentUserId = demo?.id;
    }

    if (!currentUserId) {
      return NextResponse.json({ success: true, conversations: [] });
    }

    const conversations = await prisma.conversation.findMany({
      where: {
        members: {
          some: { userId: currentUserId },
        },
      },
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
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      currentUserId,
      conversations,
    });
  } catch (err: any) {
    console.error('Error fetching conversations:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    const { targetUserId, title } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    // Check if 1-on-1 conversation already exists
    const existing = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: senderId } } },
          { members: { some: { userId: targetUserId } } },
        ],
      },
      include: {
        members: {
          include: { user: { include: { profile: true } } },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ success: true, conversation: existing });
    }

    // Otherwise create new conversation
    const newConv = await prisma.conversation.create({
      data: {
        title: title || null,
        isGroup: false,
        members: {
          create: [{ userId: senderId }, { userId: targetUserId }],
        },
      },
      include: {
        members: {
          include: { user: { include: { profile: true } } },
        },
      },
    });

    return NextResponse.json({ success: true, conversation: newConv });
  } catch (err: any) {
    console.error('Error creating conversation:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
