import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    const body = await req.json();
    const { roomName, participantName } = body;

    const identity = user?.id || `guest_${Math.random().toString(36).substring(2, 7)}`;
    const name = participantName || user?.profile?.name || 'Developer';

    // Return token metadata for LiveKit / WebRTC client
    return NextResponse.json({
      success: true,
      livekitUrl: process.env.LIVEKIT_URL || 'ws://localhost:7880',
      roomName: roomName || 'default-room',
      identity,
      participantName: name,
      token: `demo_sfu_token_${identity}_${Date.now()}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
