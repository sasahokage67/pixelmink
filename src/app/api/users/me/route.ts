import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser, signToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: true, user });
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

    const updatedProfile = await prisma.profile.update({
      where: { userId: user.id },
      data: {
        ...(name && { name }),
        ...(bio !== undefined && { bio }),
        ...(location !== undefined && { location }),
        ...(languages !== undefined && { languages }),
        ...(availability !== undefined && { availability }),
      },
    });

    const teachSkills = user.userSkills?.filter((s) => s.type === 'TEACH').map((s) => s.skill.name) || [];
    const learnSkills = user.userSkills?.filter((s) => s.type === 'LEARN').map((s) => s.skill.name) || [];

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: updatedProfile.name || user.profile?.name || '',
      bio: updatedProfile.bio || '',
      location: updatedProfile.location || 'Remote',
      languages: updatedProfile.languages || 'English, Russian',
      teachSkills,
      learnSkills,
    });

    const response = NextResponse.json({ success: true, profile: updatedProfile, token });
    response.cookies.set('token', token, {
      httpOnly: false,
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
