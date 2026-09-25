import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = params.id;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        userSkills: {
          include: { skill: true },
        },
        achievements: {
          include: { achievement: true },
        },
        reviewsReceived: {
          include: {
            reviewer: {
              include: { profile: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        hostedSeminars: {
          take: 5,
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
