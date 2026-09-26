import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { pushPeerToCloud, syncPeersFromCloud } from '@/lib/cloudSync';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Background sync: push current active user to cloud registry & pull all peers
    const teachSkills =
      user.userSkills
        ?.filter((s: any) => s.type === 'TEACH')
        .map((s: any) => s.skill?.name || s.name) || [];
    const learnSkills =
      user.userSkills
        ?.filter((s: any) => s.type === 'LEARN')
        .map((s: any) => s.skill?.name || s.name) || [];

    pushPeerToCloud({
      id: user.id,
      email: user.email,
      name: user.profile?.name || user.email.split('@')[0],
      role: user.role,
      bio: user.profile?.bio || '',
      location: user.profile?.location || 'Remote',
      languages: user.profile?.languages || 'Russian, English',
      rating: user.profile?.rating ?? 5.0,
      xCredits: user.profile?.xCredits ?? 5,
      teachingHours: user.profile?.teachingHours ?? 0,
      learningHours: user.profile?.learningHours ?? 0,
      teachSkills,
      learnSkills,
      updatedAt: Date.now(),
    }).catch(() => {});

    syncPeersFromCloud().catch(() => {});

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        userSkills: user.userSkills,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
