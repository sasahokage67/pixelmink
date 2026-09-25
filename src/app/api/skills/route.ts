import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';

export async function GET() {
  try {
    const skills = await prisma.skill.findMany({
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ success: true, skills });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { skillName, category = 'CODING', type, level = 'INTERMEDIATE', description, learningGoal, teachingAvailability } = body;

    if (!skillName || !type) {
      return NextResponse.json({ error: 'skillName and type (TEACH/LEARN) are required' }, { status: 400 });
    }

    // Find or create skill in catalog
    let skill = await prisma.skill.findUnique({
      where: { name: skillName },
    });

    if (!skill) {
      skill = await prisma.skill.create({
        data: {
          name: skillName,
          category,
          description: description || `Skill in ${category}`,
          icon: 'code',
        },
      });
    }

    // Upsert UserSkill
    const userSkill = await prisma.userSkill.upsert({
      where: {
        userId_skillId_type: {
          userId: user.id,
          skillId: skill.id,
          type,
        },
      },
      update: {
        level,
        description: description || '',
        learningGoal: learningGoal || '',
        teachingAvailability: teachingAvailability || 'Flexible',
      },
      create: {
        userId: user.id,
        skillId: skill.id,
        type,
        level,
        description: description || '',
        learningGoal: learningGoal || '',
        teachingAvailability: teachingAvailability || 'Flexible',
      },
      include: { skill: true },
    });

    return NextResponse.json({ success: true, userSkill });
  } catch (err: any) {
    console.error('Error adding user skill:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
