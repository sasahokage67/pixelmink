import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { matchUsers } from '@/lib/matching';
import { syncPeersFromCloud } from '@/lib/cloudSync';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    // Pull any peers from other laptops/devices into local DB
    await syncPeersFromCloud();

    const user = await getSessionUser(req);
    // If not logged in, pick the first demo user (Alex) as context so the dashboard renders live matching immediately
    let targetUserId = user?.id;
    if (!targetUserId) {
      const demoUser = await prisma.user.findFirst({
        where: { email: 'alex@xchange.dev' },
      });
      targetUserId = demoUser?.id;
    }

    if (!targetUserId) {
      return NextResponse.json({ success: true, matches: [] });
    }

    const matches = await matchUsers(targetUserId);

    return NextResponse.json({
      success: true,
      matches,
      targetUserId,
    });
  } catch (err: any) {
    console.error('Matches error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { targetUserId, score = 85, reason = 'Direct connection' } = body;

    const match = await prisma.match.upsert({
      where: {
        userAId_userBId: {
          userAId: user.id,
          userBId: targetUserId,
        },
      },
      update: {
        status: 'ACCEPTED',
      },
      create: {
        userAId: user.id,
        userBId: targetUserId,
        score,
        reason,
        status: 'PENDING',
      },
    });

    // Also create notification for target user
    await prisma.notification.create({
      data: {
        userId: targetUserId,
        type: 'MATCH',
        title: 'New Exchange Connection Request',
        message: `${user.profile?.name || 'A user'} wants to connect for a knowledge exchange!`,
        link: '/matches',
      },
    });

    return NextResponse.json({ success: true, match });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
