import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';
import { syncPeersFromCloud, pushPeerToCloud } from '@/lib/cloudSync';

export async function POST(req: NextRequest) {
  try {
    // Pull any newly registered users from other laptops before checking credentials
    await syncPeersFromCloud();

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Username/Email and password are required' },
        { status: 400 }
      );
    }

    const trimmedInput = email.trim();
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: trimmedInput },
          { email: trimmedInput.toLowerCase() },
          { profile: { name: { equals: trimmedInput } } },
          { email: `${trimmedInput.toLowerCase()}@peer.dev` },
        ],
      },
      include: {
        profile: true,
        userSkills: {
          include: { skill: true },
        },
      },
    });

    if (!user) {
      const allUsers = await prisma.user.findMany({
        include: { profile: true, userSkills: { include: { skill: true } } },
      });
      user =
        allUsers.find(
          (u) =>
            u.profile?.name?.toLowerCase() === trimmedInput.toLowerCase() ||
            u.email.toLowerCase() === trimmedInput.toLowerCase() ||
            u.email.toLowerCase() === `${trimmedInput.toLowerCase()}@peer.dev`
        ) || null;
    }

    if (!user) {
      return NextResponse.json({ error: 'Неверный никнейм или пароль' }, { status: 401 });
    }

    const isMatch = await comparePassword(password, user.password);
    if (!isMatch) {
      return NextResponse.json({ error: 'Неверный никнейм или пароль' }, { status: 401 });
    }

    const teachSkills =
      user.userSkills?.filter((s) => s.type === 'TEACH').map((s) => s.skill.name) || [];
    const learnSkills =
      user.userSkills?.filter((s) => s.type === 'LEARN').map((s) => s.skill.name) || [];

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.profile?.name || user.email.split('@')[0],
      bio: user.profile?.bio || '',
      location: user.profile?.location || 'Remote',
      languages: user.profile?.languages || 'Russian, English',
      teachSkills,
      learnSkills,
    });

    // Announce user presence in cloud registry
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

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        userSkills: user.userSkills,
      },
      token,
    });

    response.cookies.set('token', token, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Login failed' }, { status: 500 });
  }
}
