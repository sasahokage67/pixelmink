import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { syncPeersFromCloud } from '@/lib/cloudSync';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const forceSync = searchParams.get('force') === 'true';

    // Pull any peers registered on other laptops / serverless containers
    await syncPeersFromCloud(forceSync);

    const search = searchParams.get('search') || '';
    const skill = searchParams.get('skill') || '';
    const category = searchParams.get('category') || '';
    const level = searchParams.get('level') || '';
    const language = searchParams.get('language') || '';
    const verifiedOnly = searchParams.get('verified') === 'true';

    const currentUser = await getSessionUser(req);

    const rawSearch = searchParams.get('search') || searchParams.get('nickname') || '';
    const cleanSearch = rawSearch.trim().replace(/^@/, '');

    // Build filter conditions
    const where: any = {};

    if (currentUser) {
      where.id = { not: currentUser.id };
    }

    if (cleanSearch) {
      where.OR = [
        { profile: { name: { contains: cleanSearch } } },
        { profile: { name: { contains: cleanSearch.toLowerCase() } } },
        { profile: { name: { contains: cleanSearch.toUpperCase() } } },
        { email: { contains: cleanSearch.toLowerCase() } },
        { profile: { bio: { contains: cleanSearch } } },
        { userSkills: { some: { skill: { name: { contains: cleanSearch } } } } },
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

    let users = await prisma.user.findMany({
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
      take: 60,
    });

    // Case-insensitive fallback if nothing found with Prisma contains
    if (users.length === 0 && cleanSearch) {
      const allCandidates = await prisma.user.findMany({
        where: currentUser ? { id: { not: currentUser.id } } : {},
        include: {
          profile: true,
          userSkills: {
            include: { skill: true },
          },
        },
        take: 100,
      });

      const q = cleanSearch.toLowerCase();
      users = allCandidates.filter((u) => {
        const uName = (u.profile?.name || '').toLowerCase();
        const uEmail = (u.email || '').toLowerCase();
        const uBio = (u.profile?.bio || '').toLowerCase();
        const hasSkill = u.userSkills?.some((s) =>
          (s.skill?.name || '').toLowerCase().includes(q)
        );
        return uName.includes(q) || uEmail.includes(q) || uBio.includes(q) || hasSkill;
      });
    }

    // Direct cloud registry search fallback if still not found
    if (users.length === 0 && cleanSearch) {
      const freshCloudPeers = await syncPeersFromCloud(true);
      const q = cleanSearch.toLowerCase();
      const matchedFromCloud = freshCloudPeers.filter(
        (cp) =>
          cp.name.toLowerCase().includes(q) ||
          cp.email.toLowerCase().includes(q) ||
          (cp.bio && cp.bio.toLowerCase().includes(q))
      );

      if (matchedFromCloud.length > 0) {
        // Query database again now that syncPeersFromCloud hydrated them
        users = await prisma.user.findMany({
          where: {
            OR: matchedFromCloud.map((cp) => ({ id: cp.id })),
          },
          include: {
            profile: true,
            userSkills: {
              include: { skill: true },
            },
          },
        });
      }
    }

    return NextResponse.json({ success: true, users });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
