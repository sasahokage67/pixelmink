import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const CLOUD_SIGNALING_ID = 'ff808181a09d98f701a0ddbb49c91d6c';
const CLOUD_SIGNALING_URL = `https://api.restful-api.dev/objects/${CLOUD_SIGNALING_ID}`;

// In-memory cache for ultra-low latency signaling within same lambda
const memoryActiveCalls = new Map<string, any>(); // callId -> call
const memoryRoomSignals = new Map<string, any[]>(); // roomId -> signals array

async function fetchCloudData(): Promise<{ activeCalls: any[]; roomSignals: Record<string, any[]> }> {
  try {
    const res = await fetch(CLOUD_SIGNALING_URL, { cache: 'no-store' });
    if (!res.ok) return { activeCalls: [], roomSignals: {} };
    const json = await res.json();
    return json.data || { activeCalls: [], roomSignals: {} };
  } catch {
    return { activeCalls: [], roomSignals: {} };
  }
}

async function updateCloudData(data: { activeCalls: any[]; roomSignals: Record<string, any[]> }): Promise<void> {
  try {
    await fetch(CLOUD_SIGNALING_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'pixelmink_calls_signaling_v1',
        data,
      }),
    });
  } catch (err) {
    console.warn('updateCloudData error:', err);
  }
}

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

      // Check cloud registry
      const cloudData = await fetchCloudData();
      const freshCalls = (cloudData.activeCalls || []).filter(
        (c: any) => now - c.createdAt < 45000
      );

      const found = freshCalls.find(
        (c: any) => c.receiverId === userId && c.status === 'RINGING'
      );

      if (found) {
        memoryActiveCalls.set(found.roomId, found);
        return NextResponse.json({ incomingCall: found });
      }

      return NextResponse.json({ incomingCall: null });
    }

    // 2. Poll room WebRTC signals & events
    if (action === 'room_poll' && roomId && peerId) {
      const memSignals = memoryRoomSignals.get(roomId) || [];
      const cloudData = await fetchCloudData();
      const cloudRoomSignals = cloudData.roomSignals?.[roomId] || [];

      // Combine signals without duplicates
      const signalMap = new Map<string, any>();
      for (const s of [...cloudRoomSignals, ...memSignals]) {
        if (s.id) signalMap.set(s.id, s);
      }

      const allSignals = Array.from(signalMap.values());
      const pendingForPeer = allSignals.filter(
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
      const callRecord = {
        id: `call_${roomId}_${now}`,
        roomId,
        callerId,
        callerName,
        callerAvatar,
        receiverId,
        type: type || 'VIDEO',
        status: 'RINGING',
        createdAt: now,
      };

      memoryActiveCalls.set(roomId, callRecord);

      const cloudData = await fetchCloudData();
      const filteredCalls = (cloudData.activeCalls || []).filter(
        (c: any) => now - c.createdAt < 45000 && c.roomId !== roomId
      );
      filteredCalls.push(callRecord);

      await updateCloudData({
        ...cloudData,
        activeCalls: filteredCalls,
      });

      return NextResponse.json({ success: true, call: callRecord });
    }

    // 2. Accept call
    if (action === 'accept') {
      const { roomId } = body;
      const memCall = memoryActiveCalls.get(roomId);
      if (memCall) memCall.status = 'ACCEPTED';

      const cloudData = await fetchCloudData();
      const updated = (cloudData.activeCalls || []).map((c: any) =>
        c.roomId === roomId ? { ...c, status: 'ACCEPTED' } : c
      );
      await updateCloudData({ ...cloudData, activeCalls: updated });

      return NextResponse.json({ success: true });
    }

    // 3. Reject / Cancel call
    if (action === 'reject') {
      const { roomId } = body;
      memoryActiveCalls.delete(roomId);

      const cloudData = await fetchCloudData();
      const updated = (cloudData.activeCalls || []).filter((c: any) => c.roomId !== roomId);
      await updateCloudData({ ...cloudData, activeCalls: updated });

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

      // Store in cloud object
      const cloudData = await fetchCloudData();
      const roomSignals = cloudData.roomSignals || {};
      const list = roomSignals[roomId] || [];
      const freshList = list.filter((s: any) => now - s.createdAt < 60000);
      freshList.push(signalEntry);
      roomSignals[roomId] = freshList;

      await updateCloudData({
        ...cloudData,
        roomSignals,
      });

      return NextResponse.json({ success: true, signalId: signalEntry.id });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Signaling error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
