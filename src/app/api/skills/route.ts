import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { pushPeerToCloud } from '@/lib/cloudSync';

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
    const {
      skillName,
      category = 'CODING',
      type,
      level = 'INTERMEDIATE',
      description,
      learningGoal,
      teachingAvailability,
    } = body;

    if (!skillName || !type) {
      return NextResponse.json(
        { error: 'skillName and type (TEACH/LEARN) are required' },
        { status: 400 }
      );
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

    // Sync updated skills to global cloud registry
    const allUserSkills = await prisma.userSkill.findMany({
      where: { userId: user.id },
      include: { skill: true },
    });

    const teachSkills = allUserSkills
      .filter((s) => s.type === 'TEACH')
      .map((s) => s.skill.name);
    const learnSkills = allUserSkills
      .filter((s) => s.type === 'LEARN')
      .map((s) => s.skill.name);

    pushPeerToCloud({
      id: user.id,
      email: user.email,
      name: user.profile?.name || user.email.split('@')[0],
      role: user.role,
      bio: user.profile?.bio || '',
      location: user.profile?.location || 'Remote',
      languages: user.profile?.languages || 'English, Russian',
      rating: user.profile?.rating ?? 5.0,
      xCredits: user.profile?.xCredits ?? 5,
      teachingHours: user.profile?.teachingHours ?? 0,
      learningHours: user.profile?.learningHours ?? 0,
      teachSkills,
      learnSkills,
      updatedAt: Date.now(),
    }).catch(() => {});

    return NextResponse.json({ success: true, userSkill });
  } catch (err: any) {
    console.error('Error adding user skill:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const userSkillId = searchParams.get('id');
    if (!userSkillId) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    await prisma.userSkill.deleteMany({
      where: {
        id: userSkillId,
        userId: user.id,
      },
    });

    // Sync updated skills to global cloud registry
    const allUserSkills = await prisma.userSkill.findMany({
      where: { userId: user.id },
      include: { skill: true },
    });

    const teachSkills = allUserSkills
      .filter((s) => s.type === 'TEACH')
      .map((s) => s.skill.name);
    const learnSkills = allUserSkills
      .filter((s) => s.type === 'LEARN')
      .map((s) => s.skill.name);

    pushPeerToCloud({
      id: user.id,
      email: user.email,
      name: user.profile?.name || user.email.split('@')[0],
      role: user.role,
      bio: user.profile?.bio || '',
      location: user.profile?.location || 'Remote',
      languages: user.profile?.languages || 'English, Russian',
      rating: user.profile?.rating ?? 5.0,
      xCredits: user.profile?.xCredits ?? 5,
      teachingHours: user.profile?.teachingHours ?? 0,
      learningHours: user.profile?.learningHours ?? 0,
      teachSkills,
      learnSkills,
      updatedAt: Date.now(),
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
