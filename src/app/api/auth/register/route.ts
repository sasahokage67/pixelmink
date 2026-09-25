import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      email,
      password,
      name,
      role = 'USER',
      bio,
      teachSkills = [],
      learnSkills = [],
      teachSkill,
      learnSkill,
    } = body;

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Email, password, and name are required' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);

    const userBio = bio?.trim() || 'Computer Science engineer & peer knowledge contributor';

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        profile: {
          create: {
            name,
            bio: userBio,
            location: 'Remote',
            languages: 'English',
            xCredits: 5, // Welcome bonus
          },
        },
      },
      include: { profile: true },
    });

    // Normalize teach and learn skills
    const teachList: string[] = Array.isArray(teachSkills) && teachSkills.length > 0
      ? teachSkills
      : (teachSkill ? [teachSkill] : ['Python']);

    const learnList: string[] = Array.isArray(learnSkills) && learnSkills.length > 0
      ? learnSkills
      : (learnSkill ? [learnSkill] : ['Rust']);

    for (const skillName of teachList) {
      if (!skillName) continue;
      let skill = await prisma.skill.findFirst({
        where: { name: { equals: skillName } },
      });
      if (!skill) {
        skill = await prisma.skill.findFirst({
          where: { name: { contains: skillName } },
        });
      }
      if (!skill) {
        skill = await prisma.skill.create({
          data: {
            name: skillName,
            category: 'COMPUTER_SCIENCE',
            description: `Computer science topic: ${skillName}`,
            icon: 'code',
          },
        });
      }

      await prisma.userSkill.create({
        data: {
          userId: user.id,
          skillId: skill.id,
          type: 'TEACH',
          level: 'INTERMEDIATE',
          description: `Ready to teach ${skillName}. Focus: deep dive and code review.`,
        },
      });
    }

    for (const skillName of learnList) {
      if (!skillName) continue;
      let skill = await prisma.skill.findFirst({
        where: { name: { equals: skillName } },
      });
      if (!skill) {
        skill = await prisma.skill.findFirst({
          where: { name: { contains: skillName } },
        });
      }
      if (!skill) {
        skill = await prisma.skill.create({
          data: {
            name: skillName,
            category: 'COMPUTER_SCIENCE',
            description: `Computer science topic: ${skillName}`,
            icon: 'code',
          },
        });
      }

      await prisma.userSkill.create({
        data: {
          userId: user.id,
          skillId: skill.id,
          type: 'LEARN',
          level: 'BEGINNER',
          learningGoal: `Wants to master ${skillName} through peer collaboration.`,
        },
      });
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
        title: 'Welcome to pixelmink',
        message: 'Your profile is active. Check peer matches in Discover & Matches tab.',
        link: '/matches',
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
