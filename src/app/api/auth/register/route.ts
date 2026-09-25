import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password, name, role = 'USER', teachSkill, learnSkill } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        profile: {
          create: {
            name,
            bio: 'Tech learner & knowledge contributor',
            location: 'Remote',
            languages: 'English',
            xCredits: 5, // Welcome bonus
          },
        },
      },
      include: { profile: true },
    });

    // Optionally attach initial skills if selected
    if (teachSkill) {
      const skill = await prisma.skill.findFirst({ where: { name: { contains: teachSkill } } });
      if (skill) {
        await prisma.userSkill.create({
          data: {
            userId: user.id,
            skillId: skill.id,
            type: 'TEACH',
            level: 'INTERMEDIATE',
            description: `Ready to teach ${teachSkill}`,
          },
        });
      }
    }

    if (learnSkill) {
      const skill = await prisma.skill.findFirst({ where: { name: { contains: learnSkill } } });
      if (skill) {
        await prisma.userSkill.create({
          data: {
            userId: user.id,
            skillId: skill.id,
            type: 'LEARN',
            level: 'BEGINNER',
            learningGoal: `Wants to master ${learnSkill}`,
          },
        });
      }
    }

    // Add bonus welcome credit transaction
    await prisma.xCreditTransaction.create({
      data: {
        userId: user.id,
        amount: 5,
        type: 'BONUS',
        description: 'Welcome bonus: 5 XCredits',
      },
    });

    // Add welcome notification
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: 'MATCH',
        title: 'Welcome to XCHANGE',
        message: 'Your profile is active. Find your first peer match in the Discover tab.',
        link: '/discover',
      },
    });

    const token = signToken({ userId: user.id, email: user.email, role: user.role });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
      },
      token,
    });

    response.cookies.set('token', token, {
      httpOnly: false, // Accessible to client scripts if needed, or secure
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    console.error('Register error:', err);
    return NextResponse.json({ error: err.message || 'Registration failed' }, { status: 500 });
  }
}
