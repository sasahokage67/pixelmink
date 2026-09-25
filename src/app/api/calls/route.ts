import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    let callerId = user?.id;
    if (!callerId) {
      const demo = await prisma.user.findFirst({ where: { email: 'alex@xchange.dev' } });
      callerId = demo?.id;
    }

    if (!callerId) {
      return NextResponse.json({ error: 'Caller required' }, { status: 401 });
    }

    const body = await req.json();
    const { receiverId, type = 'VIDEO', roomId } = body;

    const finalRoomId = roomId || `call_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const call = await prisma.call.create({
      data: {
        callerId,
        receiverId: receiverId || null,
        roomId: finalRoomId,
        type,
        status: 'ACTIVE',
      },
      include: {
        caller: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
    });

    return NextResponse.json({ success: true, call });
  } catch (err: any) {
    console.error('Call creation error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const roomId = searchParams.get('roomId');

    if (!roomId) {
      return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    }

    const call = await prisma.call.findUnique({
      where: { roomId },
      include: {
        caller: { include: { profile: true } },
        receiver: { include: { profile: true } },
      },
    });

    return NextResponse.json({ success: true, call });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
