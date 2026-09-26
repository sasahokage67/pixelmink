import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { comparePassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Username/Email and password are required' }, { status: 400 });
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
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

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
