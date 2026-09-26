import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { blockUser, unblockUser, getCloudRegistry } from '@/lib/matchBlock';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    let userId = user?.id;
    if (!userId) {
      const demo = await prisma.user.findFirst({ where: { email: 'alex@xchange.dev' } });
      userId = demo?.id;
    }

    if (!userId) {
      return NextResponse.json({ success: true, blockedUserIds: [] });
    }

    // 1. Get from local DB
    const dbBlocks = await prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    const dbIds = dbBlocks.map((b) => b.blockedId);

    // 2. Get from cloud registry
    const cloud = await getCloudRegistry();
    const cloudIds = (cloud.blocks || [])
      .filter((b) => b.blockerId === userId)
      .map((b) => b.blockedId);

    const allBlocked = Array.from(new Set([...dbIds, ...cloudIds]));

    return NextResponse.json({
      success: true,
      blockedUserIds: allBlocked,
    });
  } catch (err: any) {
    console.error('GET /api/block error:', err);
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
    const { action, targetUserId } = body;

    if (!targetUserId) {
      return NextResponse.json({ error: 'targetUserId is required' }, { status: 400 });
    }

    if (action === 'unblock') {
      await unblockUser(userId, targetUserId);
      return NextResponse.json({ success: true, isBlocked: false });
    } else {
      await blockUser(userId, targetUserId);
      return NextResponse.json({ success: true, isBlocked: true });
    }
  } catch (err: any) {
    console.error('POST /api/block error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
