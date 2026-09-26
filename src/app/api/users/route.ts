import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const skill = searchParams.get('skill') || '';
    const category = searchParams.get('category') || '';
    const level = searchParams.get('level') || '';
    const language = searchParams.get('language') || '';
    const verifiedOnly = searchParams.get('verified') === 'true';

    const currentUser = await getSessionUser(req);

    // Build filter conditions
    const where: any = {};

    if (currentUser) {
      where.id = { not: currentUser.id };
    }

    if (search) {
      where.OR = [
        { profile: { name: { contains: search } } },
        { profile: { bio: { contains: search } } },
        { userSkills: { some: { skill: { name: { contains: search } } } } },
      ];
    }

    if (verifiedOnly) {
      where.profile = { ...(where.profile || {}), verified: true };
    }

    if (language) {
      where.profile = {
        ...(where.profile || {}),
        languages: { contains: language },
      };
    }

    if (skill) {
      where.userSkills = {
        some: {
          skill: { name: { contains: skill } },
        },
      };
    }

    if (category) {
      where.userSkills = {
        some: {
          skill: { category: { equals: category } },
        },
      };
    }

    if (level) {
      where.userSkills = {
        some: {
          level: { equals: level },
        },
      };
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        profile: true,
        userSkills: {
          include: { skill: true },
        },
      },
      orderBy: {
        profile: { rating: 'desc' },
      },
      take: 50,
    });

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
