import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { isUserMatched, isUserBlocked } from '@/lib/matchBlock';
import { directConversationId, isUsableConversation } from '@/lib/conversations';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const currentUserId = user.id;

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

    // Auto-sync accepted matches into conversations
    const acceptedMatches = await prisma.match.findMany({
      where: {
        status: 'ACCEPTED',
        OR: [{ userAId: currentUserId }, { userBId: currentUserId }],
      },
    });

    for (const m of acceptedMatches) {
      const partnerId = m.userAId === currentUserId ? m.userBId : m.userAId;
      const hasConv = conversations.some((c) =>
        c.members.some((mem: any) => mem.userId === partnerId)
      );
      if (!hasConv) {
        try {
          const directId = directConversationId(currentUserId, partnerId);
          const newC = await prisma.conversation.create({
            data: {
              id: directId,
              isGroup: false,
              members: {
                create: [{ userId: currentUserId }, { userId: partnerId }],
              },
            },
            include: {
              members: {
                include: {
                  user: { include: { profile: true } },
                },
              },
              messages: { take: 1 },
            },
          });
          conversations.unshift(newC);
        } catch {
          // Another serverless invocation may have created the deterministic
          // conversation first. The next list refresh will return that row.
        }
      }
    }

    // Never expose legacy one-sided direct chats. They were produced by the old
    // message "auto-heal" path and render as the fake "Tech Peer" participant.
    const validConversations = conversations.filter((conversation) =>
      isUsableConversation(conversation, currentUserId)
    );

    return NextResponse.json({
      success: true,
      currentUserId,
      conversations: validConversations,
    });
  } catch (err: any) {
    console.error('Error fetching conversations:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    const senderId = user.id;

    const body = await req.json();
    const { targetUserId, title } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }
    if (targetUserId === senderId) {
      return NextResponse.json({ error: 'Cannot create a conversation with yourself' }, { status: 400 });
    }
    const targetExists = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });
    if (!targetExists) return NextResponse.json({ error: 'Target user not found' }, { status: 404 });

    // 1. Check if blocked
    if (await isUserBlocked(senderId, targetUserId)) {
      return NextResponse.json(
        { error: 'Диалог заблокирован' },
        { status: 403 }
      );
    }

    // 2. Auto-confirm mutual match between both engineers when starting chat
    try {
      const existingMatch = await prisma.match.findFirst({
        where: {
          OR: [
            { userAId: senderId, userBId: targetUserId },
            { userAId: targetUserId, userBId: senderId },
          ],
        },
      });

      if (existingMatch) {
        if (existingMatch.status !== 'ACCEPTED') {
          await prisma.match.update({
            where: { id: existingMatch.id },
            data: { status: 'ACCEPTED' },
          });
        }
      } else {
        await prisma.match.create({
          data: {
            userAId: senderId,
            userBId: targetUserId,
            status: 'ACCEPTED',
            reason: 'Direct chat match',
          },
        });
      }

      // Notify peer that match is confirmed
      fetch(`https://ntfy.sh/pixelmink_user_${targetUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'match_accepted',
          partnerId: senderId,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch (err) {
      console.warn('Auto match creation error:', err);
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
    // A deterministic id makes concurrent serverless requests idempotent.
    const directId = directConversationId(senderId, targetUserId);
    let newConv;
    try {
      newConv = await prisma.conversation.create({
        data: {
          id: directId,
          title: title || null,
          isGroup: false,
          members: { create: [{ userId: senderId }, { userId: targetUserId }] },
        },
        include: {
          members: { include: { user: { include: { profile: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
    } catch {
      newConv = await prisma.conversation.findUnique({
        where: { id: directId },
        include: {
          members: { include: { user: { include: { profile: true } } } },
          messages: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      });
      if (!newConv) throw new Error('Unable to create conversation');
    }

    return NextResponse.json({ success: true, conversation: newConv });
  } catch (err: any) {
    console.error('Error creating conversation:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
