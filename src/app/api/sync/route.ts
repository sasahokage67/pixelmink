import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  syncPeersFromCloud,
  pushPeerToCloud,
  broadcastLocalUsersToCloud,
} from '@/lib/cloudSync';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Broadcast any local users to cloud so other devices know about them
    await broadcastLocalUsersToCloud();
    // Force pull all peers from cloud
    const peers = await syncPeersFromCloud(true);

    return NextResponse.json({
      success: true,
      count: peers.length,
      peers,
      timestamp: Date.now(),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (user && user.profile?.name) {
      const teachSkills =
        user.userSkills
          ?.filter((s: any) => s.type === 'TEACH')
          .map((s: any) => s.skill?.name || s.name) || [];
      const learnSkills =
        user.userSkills
          ?.filter((s: any) => s.type === 'LEARN')
          .map((s: any) => s.skill?.name || s.name) || [];

      await pushPeerToCloud({
        id: user.id,
        email: user.email,
        name: user.profile.name,
        role: user.role,
        bio: user.profile.bio || '',
        location: user.profile.location || 'Remote',
        languages: user.profile.languages || 'Russian, English',
        rating: user.profile.rating ?? 5.0,
        xCredits: user.profile.xCredits ?? 5,
        teachingHours: user.profile.teachingHours ?? 0,
        learningHours: user.profile.learningHours ?? 0,
        teachSkills,
        learnSkills,
        updatedAt: Date.now(),
      });
    }

    const peers = await syncPeersFromCloud(true);
    return NextResponse.json({ success: true, count: peers.length, peers });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
