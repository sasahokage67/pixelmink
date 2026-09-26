import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, signToken } from '@/lib/auth';
import { pushPeerToCloud, syncPeersFromCloud } from '@/lib/cloudSync';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // Pull any updates from other laptops
    await syncPeersFromCloud();

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        profile: true,
        userSkills: {
          include: { skill: true },
        },
      },
    });

    return NextResponse.json({ success: true, user: fullUser || user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { name, bio, location, languages, availability } = body;

    const defaultName = name || user.profile?.name || user.email.split('@')[0];

    const updatedProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        name: defaultName,
        bio: bio ?? '',
        location: location ?? 'Remote',
        languages: languages ?? 'English, Russian',
        availability: availability ?? 'Mon-Fri 18:00-21:00',
      },
      update: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(languages !== undefined && { languages }),
        ...(availability !== undefined && { availability }),
      },
    });

    // Query full userSkills to accurately populate token and cloud registry
    const freshSkills = await prisma.userSkill.findMany({
      where: { userId: user.id },
      include: { skill: true },
    });

    const teachSkills = freshSkills
      .filter((s) => s.type === 'TEACH')
      .map((s) => s.skill.name);
    const learnSkills = freshSkills
      .filter((s) => s.type === 'LEARN')
      .map((s) => s.skill.name);

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: updatedProfile.name,
      bio: updatedProfile.bio || '',
      location: updatedProfile.location || 'Remote',
      languages: updatedProfile.languages || 'English, Russian',
      teachSkills,
      learnSkills,
    });

    pushPeerToCloud({
      id: user.id,
      email: user.email,
      name: updatedProfile.name,
      role: user.role,
      bio: updatedProfile.bio || '',
      location: updatedProfile.location || 'Remote',
      languages: updatedProfile.languages || 'English, Russian',
      rating: updatedProfile.rating ?? 5.0,
      xCredits: updatedProfile.xCredits ?? 5,
      teachingHours: updatedProfile.teachingHours ?? 0,
      learningHours: updatedProfile.learningHours ?? 0,
      teachSkills,
      learnSkills,
      updatedAt: Date.now(),
    }).catch(() => {});

    const response = NextResponse.json({ success: true, profile: updatedProfile, token });
    response.cookies.set('token', token, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    console.error('Error updating user profile:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
