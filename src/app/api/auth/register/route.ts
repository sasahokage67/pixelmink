import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, signToken } from '@/lib/auth';
import { pushPeerToCloud } from '@/lib/cloudSync';

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

    const cleanName = (name || '').trim();

    if (!cleanName || !password) {
      return NextResponse.json({ error: 'Укажите никнейм и пароль' }, { status: 400 });
    }

    // 1. Prohibit spaces
    if (/\s/.test(cleanName)) {
      return NextResponse.json({
        error: 'В никнейме запрещены пробелы. Используйте только латиницу, цифры, точку (.) или нижнее подчеркивание (_).'
      }, { status: 400 });
    }

    // 2. Strict character whitelist: only a-z, A-Z, 0-9, dot (.), underscore (_)
    const USERNAME_REGEX = /^[a-zA-Z0-9._]{3,24}$/;
    if (!USERNAME_REGEX.test(cleanName)) {
      return NextResponse.json({
        error: 'Никнейм должен быть от 3 до 24 символов и содержать только латинские буквы, цифры, точку (.) или нижнее подчеркивание (_).'
      }, { status: 400 });
    }

    // 3. Must contain at least one alphanumeric character
    if (!/[a-zA-Z0-9]/.test(cleanName)) {
      return NextResponse.json({
        error: 'Никнейм должен содержать хотя бы одну букву или цифру.'
      }, { status: 400 });
    }

    // 4. Check if nickname is taken (case-insensitive)
    const existingProfiles = await prisma.profile.findMany({ select: { name: true } });
    const isTaken = existingProfiles.some((p) => p.name.toLowerCase() === cleanName.toLowerCase());
    if (isTaken) {
      return NextResponse.json({ error: `Никнейм "${cleanName}" уже занят другим пользователем` }, { status: 409 });
    }

    const cleanHandle = cleanName.toLowerCase();
    let userEmail = email?.trim();
    if (!userEmail) {
      userEmail = `${cleanHandle}@peer.dev`;
      const existingUserWithEmail = await prisma.user.findUnique({ where: { email: userEmail } });
      if (existingUserWithEmail) {
        userEmail = `${cleanHandle}_${Date.now().toString(36)}@peer.dev`;
      }
    } else {
      const existingByEmail = await prisma.user.findUnique({ where: { email: userEmail } });
      if (existingByEmail) {
        return NextResponse.json({ error: 'Пользователь с такой почтой уже существует' }, { status: 409 });
      }
    }

    const hashedPassword = await hashPassword(password);

    const userBio = bio?.trim() || 'Computer Science engineer & peer knowledge contributor';

    const user = await prisma.user.create({
      data: {
        email: userEmail,
        password: hashedPassword,
        role,
        profile: {
          create: {
            name: cleanName,
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

    // Sync to cloud registry for multi-laptop discovery
    pushPeerToCloud({
      id: user.id,
      email: user.email,
      name: user.profile?.name || cleanName,
      role: user.role,
      bio: userBio,
      location: user.profile?.location || 'Remote',
      languages: user.profile?.languages || 'English',
      rating: 5,
      xCredits: 5,
      teachSkills: teachList,
      learnSkills: learnList,
      updatedAt: Date.now(),
    }).catch(() => {});

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.profile?.name || cleanName,
      bio: userBio,
      location: user.profile?.location || 'Remote',
      languages: user.profile?.languages || 'English',
      teachSkills: teachList,
      learnSkills: learnList,
    });

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
