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

    // Fetch local matches
    const dbMatches = await prisma.match.findMany({
      where: {
        OR: [{ userAId: targetUserId }, { userBId: targetUserId }],
      },
      include: {
        userA: { include: { profile: true } },
        userB: { include: { profile: true } },
      },
    });

    // Fetch cloud matches & blocks
    const cloud = await getCloudRegistry();
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
        ...cloudBlocks.filter((b) => b.blockerId === targetUserId).map((b) => b.blockedId),
      ])
    );

    // Merge match records
    const connectedUserIds = new Set<string>();
    const pendingSentIds = new Set<string>();
    const pendingReceivedMap = new Map<string, any>();

    // Process DB matches
    for (const m of dbMatches) {
      const otherId = m.userAId === targetUserId ? m.userBId : m.userAId;
      if (blockedUserIds.includes(otherId)) continue;

      if (m.status === 'ACCEPTED') {
        connectedUserIds.add(otherId);
      } else if (m.status === 'PENDING') {
        if (m.userAId === targetUserId) {
          pendingSentIds.add(m.userBId);
        } else {
          pendingReceivedMap.set(m.userAId, {
            id: m.id,
            user: m.userA,
            reason: m.reason,
            score: m.score,
            createdAt: m.createdAt,
          });
        }
      }
    }

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
