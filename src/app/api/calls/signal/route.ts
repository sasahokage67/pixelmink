import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isUserBlocked } from '@/lib/matchBlock';

export const dynamic = 'force-dynamic';

// In-memory cache for ultra-low latency signaling within same process
const memoryActiveCalls = new Map<string, any>(); // roomId -> callRecord
const memoryRoomSignals = new Map<string, any[]>(); // roomId -> signals array

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const userId = searchParams.get('userId');
    const roomId = searchParams.get('roomId');
    const peerId = searchParams.get('peerId');
    const since = parseInt(searchParams.get('since') || '0', 10);

    const now = Date.now();

    // 1. Check if user has incoming call
    if (action === 'check_incoming' && userId) {
      // Check memory first
      const memCalls = Array.from(memoryActiveCalls.values());
      const memFound = memCalls.find(
        (call: any) =>
          call.receiverId === userId &&
          call.status === 'RINGING' &&
          now - call.createdAt < 45000
      );
      if (memFound) {
        return NextResponse.json({ incomingCall: memFound });
      }

      // Check DB for active call
      try {
        const dbCall = await prisma.call.findFirst({
          where: {
            receiverId: userId,
            status: 'CALLING',
            startedAt: { gte: new Date(now - 45000) },
          },
          include: {
            caller: { include: { profile: true } },
          },
        });
        if (dbCall) {
          const formatted = {
            roomId: dbCall.roomId,
            callerId: dbCall.callerId,
            callerName: dbCall.caller?.profile?.name || dbCall.caller?.email?.split('@')[0] || 'Peer',
            callerAvatar: dbCall.caller?.profile?.avatar || '',
            receiverId: userId,
            type: dbCall.type,
            status: 'RINGING',
            createdAt: dbCall.startedAt.getTime(),
          };
          memoryActiveCalls.set(dbCall.roomId, formatted);
          return NextResponse.json({ incomingCall: formatted });
        }
      } catch {}

      return NextResponse.json({ incomingCall: null });
    }

    // 2. Poll room WebRTC signals & events
    if (action === 'room_poll' && roomId && peerId) {
      const memSignals = memoryRoomSignals.get(roomId) || [];

      const pendingForPeer = memSignals.filter(
        (s) =>
          s.createdAt > since &&
          s.fromPeerId !== peerId &&
          (!s.toPeerId || s.toPeerId === peerId)
      );

      return NextResponse.json({
        success: true,
        signals: pendingForPeer,
        timestamp: now,
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const now = Date.now();

    // 1. Initiate incoming call to receiver
    if (action === 'initiate') {
      const { roomId, callerId, callerName, callerAvatar, receiverId, type } = body;

      if (receiverId && callerId) {
        if (await isUserBlocked(callerId, receiverId)) {
          return NextResponse.json(
            { error: 'Звонок отклонен: контакт заблокирован' },
            { status: 403 }
          );
        }
      }

      const callRecord = {
        id: `call_${roomId}_${now}`,
        roomId,
        callerId,
        callerName: callerName || 'Инженер',
        callerAvatar: callerAvatar || '',
        receiverId,
        type: type || 'VIDEO',
        status: 'RINGING',
        createdAt: now,
      };

      memoryActiveCalls.set(roomId, callRecord);

      // Save to database
      try {
        await prisma.call.upsert({
          where: { roomId },
          create: {
            roomId,
            callerId,
            receiverId: receiverId || null,
            type: type || 'VIDEO',
            status: 'CALLING',
          },
          update: {
            status: 'CALLING',
          },
        });
      } catch {}

      // Real-time broadcast to receiver via ntfy (instant ring on all devices)
      if (receiverId) {
        await fetch(`https://ntfy.sh/pixelmink_user_${receiverId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'incoming_call',
            roomId,
            callerId,
            callerName: callerName || 'Инженер',
            callerAvatar: callerAvatar || '',
            callType: type || 'VIDEO',
            timestamp: now,
          }),
        }).catch(() => {});
      }

      return NextResponse.json({ success: true, call: callRecord });
    }

    // 2. Accept call
    if (action === 'accept') {
      const { roomId, callerId } = body;
      const memCall = memoryActiveCalls.get(roomId);
      if (memCall) memCall.status = 'ACCEPTED';

      try {
        await prisma.call.updateMany({
          where: { roomId },
          data: { status: 'ACTIVE' },
        });
      } catch {}

      const cleanRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
      await fetch(`https://ntfy.sh/pixelmink_call_${cleanRoomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'call_accepted',
          roomId,
          timestamp: now,
        }),
      }).catch(() => {});

      if (callerId) {
        await fetch(`https://ntfy.sh/pixelmink_user_${callerId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'call_accepted',
            roomId,
            timestamp: now,
          }),
        }).catch(() => {});
      }

      return NextResponse.json({ success: true });
    }

    // 3. Reject / Cancel call
    if (action === 'reject') {
      const { roomId, callerId } = body;
      memoryActiveCalls.delete(roomId);

      try {
        await prisma.call.updateMany({
          where: { roomId },
          data: { status: 'REJECTED' },
        });
      } catch {}

      const cleanRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
      await fetch(`https://ntfy.sh/pixelmink_call_${cleanRoomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'call_rejected',
          roomId,
          timestamp: now,
        }),
      }).catch(() => {});

      if (callerId) {
        await fetch(`https://ntfy.sh/pixelmink_user_${callerId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'call_rejected',
            roomId,
            timestamp: now,
          }),
        }).catch(() => {});
      }

      return NextResponse.json({ success: true });
    }

    // 4. Send WebRTC signal / chat message / terminal event to room
    if (action === 'room_send') {
      const { roomId, fromPeerId, toPeerId, signal } = body;
      const signalEntry = {
        id: `sig_${now}_${Math.random().toString(36).substring(2, 7)}`,
        roomId,
        fromPeerId,
        toPeerId,
        signal,
        createdAt: now,
      };

      // Store in memory
      if (!memoryRoomSignals.has(roomId)) {
        memoryRoomSignals.set(roomId, []);
      }
      const memList = memoryRoomSignals.get(roomId)!;
      memList.push(signalEntry);
      if (memList.length > 50) memList.splice(0, memList.length - 50);

      // Also publish to ntfy room channel for real-time delivery
      const cleanRoomId = roomId.replace(/[^a-zA-Z0-9_-]/g, '_');
      await fetch(`https://ntfy.sh/pixelmink_call_${cleanRoomId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'room_signal',
          fromPeerId,
          toPeerId,
          signal,
          createdAt: now,
        }),
      }).catch(() => {});

      return NextResponse.json({ success: true, signalId: signalEntry.id });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Signaling error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
