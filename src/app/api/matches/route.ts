import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { matchUsers } from '@/lib/matching';
import { syncPeersFromCloud } from '@/lib/cloudSync';
import prisma from '@/lib/prisma';
import {
  handleMatchRequest,
  getCloudRegistry,
  isUserBlocked,
} from '@/lib/matchBlock';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Pull any peers from other laptops/devices into local DB
    await syncPeersFromCloud();

    const user = await getSessionUser(req);
    let targetUserId = user?.id;
    if (!targetUserId) {
      const demoUser = await prisma.user.findFirst({
        where: { email: 'alex@xchange.dev' },
      });
      targetUserId = demoUser?.id;
    }

    if (!targetUserId) {
      return NextResponse.json({
        success: true,
        matches: [],
        connectedUserIds: [],
        pendingSentIds: [],
        pendingReceived: [],
        blockedUserIds: [],
      });
    }

    const matches = await matchUsers(targetUserId);

    // Fetch local matches with full profile and skills
    const dbMatches = await prisma.match.findMany({
      where: {
        OR: [{ userAId: targetUserId }, { userBId: targetUserId }],
      },
      include: {
        userA: {
          include: {
            profile: true,
            userSkills: { include: { skill: true } },
          },
        },
        userB: {
          include: {
            profile: true,
            userSkills: { include: { skill: true } },
          },
        },
      },
    });

    // Fetch cloud matches & blocks (failsafe)
    const cloud: any = await getCloudRegistry().catch(() => ({}));
    const cloudMatches = cloud.matches || [];
    const cloudBlocks = cloud.blocks || [];

    // Local blocks
    const dbBlocks = await prisma.block.findMany({
      where: { blockerId: targetUserId },
      select: { blockedId: true },
    });
    const blockedUserIds = Array.from(
      new Set([
        ...dbBlocks.map((b) => b.blockedId),
        ...cloudBlocks.filter((b: any) => b.blockerId === targetUserId).map((b: any) => b.blockedId),
      ])
    );

    // Merge match records
    const connectedUserIds = new Set<string>();
    const connectedUsersMap = new Map<string, any>();
    const pendingSentIds = new Set<string>();
    const pendingReceivedMap = new Map<string, any>();

    // Process DB matches
    for (const m of dbMatches) {
      const isA = m.userAId === targetUserId;
      const otherId = isA ? m.userBId : m.userAId;
      const otherUser = isA ? m.userB : m.userA;
      if (blockedUserIds.includes(otherId)) continue;

      if (m.status === 'ACCEPTED') {
        connectedUserIds.add(otherId);
        if (otherUser) {
          connectedUsersMap.set(otherId, otherUser);
        }
      } else if (m.status === 'PENDING') {
        if (isA) {
          pendingSentIds.add(otherId);
        } else {
          pendingReceivedMap.set(otherId, {
            id: m.id,
            user: otherUser,
            reason: m.reason,
            score: m.score,
            createdAt: m.createdAt,
          });
        }
      }
    }

    // Direct conversations are also confirmed contacts
    try {
      const directConvs = await prisma.conversation.findMany({
        where: {
          isGroup: false,
          members: { some: { userId: targetUserId } },
        },
        include: {
          members: {
            include: {
              user: {
                include: { profile: true, userSkills: { include: { skill: true } } },
              },
            },
          },
        },
      });

      for (const conv of directConvs) {
        const otherMem = conv.members.find((m) => m.userId !== targetUserId);
        if (otherMem?.user && !blockedUserIds.includes(otherMem.userId)) {
          connectedUserIds.add(otherMem.userId);
          if (!connectedUsersMap.has(otherMem.userId)) {
            connectedUsersMap.set(otherMem.userId, otherMem.user);
          }
        }
      }
    } catch {}

    // Process Cloud matches
    for (const cm of cloudMatches) {
      const isA = cm.userAId === targetUserId;
      const isB = cm.userBId === targetUserId;
      if (!isA && !isB) continue;

      const otherId = isA ? cm.userBId : cm.userAId;
      if (blockedUserIds.includes(otherId)) continue;

      if (cm.status === 'ACCEPTED') {
        connectedUserIds.add(otherId);
        pendingSentIds.delete(otherId);
        pendingReceivedMap.delete(otherId);
      } else if (cm.status === 'PENDING') {
        if (isA) {
          if (!connectedUserIds.has(otherId)) {
            pendingSentIds.add(otherId);
          }
        } else {
          if (!connectedUserIds.has(otherId) && !pendingReceivedMap.has(otherId)) {
            pendingReceivedMap.set(otherId, {
              id: `cloud_match_${otherId}`,
              user: { id: otherId },
              createdAt: cm.createdAt,
            });
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      matches,
      targetUserId,
      connectedUserIds: Array.from(connectedUserIds),
      connectedUsers: Array.from(connectedUsersMap.values()),
      pendingSentIds: Array.from(pendingSentIds),
      pendingReceived: Array.from(pendingReceivedMap.values()),
      blockedUserIds,
    });
  } catch (err: any) {
    console.error('Matches GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    let userId = user?.id;
    if (!userId) {
      const demo = await prisma.user.findFirst({ where: { email: 'alex@xchange.dev' } });
      userId = demo?.id;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { targetUserId, action = 'request' } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    if (await isUserBlocked(userId, targetUserId)) {
      return NextResponse.json(
        { error: 'Невозможно отправить запрос заблокированному пользователю' },
        { status: 403 }
      );
    }

    const result = await handleMatchRequest(userId, targetUserId, action);

    // If accepted or requested, create notification
    if (result.status === 'ACCEPTED') {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'MATCH',
          title: 'Взаимный мэтч подтвержден!',
          message: `${user?.profile?.name || 'Пользователь'} принял ваш запрос. Чат и созвон разблокированы!`,
          link: '/matches',
        },
      }).catch(() => {});
    } else if (result.status === 'PENDING') {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          type: 'MATCH',
          title: 'Новый запрос на взаимный обмен',
          message: `${user?.profile?.name || 'Пользователь'} хочет установить взаимный мэтч для обмена навыками!`,
          link: '/matches',
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      success: true,
      status: result.status,
      match: result.match,
    });
  } catch (err: any) {
    console.error('Matches POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
