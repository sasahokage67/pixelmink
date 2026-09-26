import prisma from './prisma';

export interface MatchResult {
  candidateUser: any;
  score: number;
  matchType: 'DIRECT_PERFECT' | 'DIRECT_STRONG' | 'CIRCULAR_CHAIN';
  reasons: string[];
  skillsOfferedToYou: string[];
  skillsWantedFromYou: string[];
  descriptionKeywordsMatched: string[];
  candidateRole?: string;
  myRole?: string;
  roleSynergyReason?: string;
  chainDetails?: {
    chainPath: string[];
    exchangeFlow: string;
  };
}

export const ROLE_TAXONOMY: Record<string, { label: string; keywords: string[] }> = {
  BACKEND: {
    label: 'Backend Engineer',
    keywords: [
      'python', 'golang', 'go', 'node', 'nodejs', 'rust', 'java', 'c#', 'php',
      'sql', 'postgresql', 'postgres', 'redis', 'backend', 'api', 'django',
      'fastapi', 'spring', 'graphql', 'grpc', 'бэкенд', 'микросервисы'
    ],
  },
  FRONTEND: {
    label: 'Frontend Developer',
    keywords: [
      'react', 'next.js', 'nextjs', 'vue', 'angular', 'typescript', 'javascript',
      'frontend', 'html', 'css', 'tailwind', 'redux', 'svelte', 'web', 'фронтенд', 'верстка'
    ],
  },
  DEVOPS: {
    label: 'DevOps & Cloud',
    keywords: [
      'docker', 'kubernetes', 'k8s', 'linux', 'ci/cd', 'aws', 'cloud', 'terraform',
      'devops', 'bash', 'ansible', 'nginx', 'инфраструктура', 'сервер'
    ],
  },
  AIML: {
    label: 'AI & Machine Learning',
    keywords: [
      'pytorch', 'tensorflow', 'ml', 'ai', 'llm', 'deep learning', 'nlp',
      'data science', 'transformer', 'prompt', 'chatgpt', 'opencv', 'rag',
      'нейросети', 'ии', 'машинное обучение'
    ],
  },
  SYSTEMS: {
    label: 'Systems & Low-Level',
    keywords: [
      'c++', 'c', 'rust', 'linux kernel', 'kernel', 'assembly', 'embedded',
      'low-level', 'systems', 'memory', 'ассемблер', 'ядро', 'системное'
    ],
  },
  MOBILE: {
    label: 'Mobile Developer',
    keywords: [
      'ios', 'android', 'swift', 'kotlin', 'flutter', 'react native', 'mobile', 'мобильные'
    ],
  },
  DESIGN: {
    label: 'UI/UX & Product Design',
    keywords: [
      'figma', 'ui/ux', 'design', 'blender', '3d', 'photoshop', 'illustrator',
      'motion', 'дизайн', 'интерфейс', 'прототип'
    ],
  },
  SECURITY: {
    label: 'Cybersecurity',
    keywords: [
      'security', 'pentest', 'appsec', 'infosec', 'reverse engineering',
      'cryptography', 'owasp', 'кибербезопасность', 'хакинг'
    ],
  },
};

const ROLE_SYNERGY: Record<string, string[]> = {
  BACKEND: ['FRONTEND', 'DEVOPS', 'AIML', 'SYSTEMS', 'MOBILE'],
  FRONTEND: ['BACKEND', 'DESIGN', 'MOBILE'],
  DEVOPS: ['BACKEND', 'AIML', 'SYSTEMS'],
  AIML: ['BACKEND', 'DEVOPS', 'SYSTEMS'],
  SYSTEMS: ['BACKEND', 'DEVOPS', 'SECURITY'],
  MOBILE: ['BACKEND', 'FRONTEND', 'DESIGN'],
  DESIGN: ['FRONTEND', 'MOBILE'],
  SECURITY: ['SYSTEMS', 'BACKEND', 'DEVOPS'],
};

export function detectRoles(user: any): {
  primaryRole: string;
  roleKey: string;
  teachRoleKeys: string[];
  learnRoleKeys: string[];
} {
  const teachSkills = user?.userSkills?.filter((s: any) => s.type === 'TEACH') || [];
  const learnSkills = user?.userSkills?.filter((s: any) => s.type === 'LEARN') || [];
  const bio = (user?.profile?.bio || '').toLowerCase();

  const getMatchedKeys = (skills: any[]) => {
    const keys = new Set<string>();
    for (const s of skills) {
      const name = (s.skill?.name || s.name || '').toLowerCase();
      const cat = (s.skill?.category || s.category || '').toUpperCase();
      for (const [key, def] of Object.entries(ROLE_TAXONOMY)) {
        if (cat.includes(key) || def.keywords.some((kw) => name.includes(kw))) {
          keys.add(key);
        }
      }
    }
    return Array.from(keys);
  };

  const teachRoleKeys = getMatchedKeys(teachSkills);
  const learnRoleKeys = getMatchedKeys(learnSkills);

  for (const [key, def] of Object.entries(ROLE_TAXONOMY)) {
    if (def.keywords.some((kw) => bio.includes(kw))) {
      if (!teachRoleKeys.includes(key)) teachRoleKeys.push(key);
    }
  }

  const primaryKey = teachRoleKeys[0] || (teachSkills.length > 0 ? 'BACKEND' : 'GENERAL');
  const primaryRole = ROLE_TAXONOMY[primaryKey]?.label || 'Software Engineer';

  return { primaryRole, roleKey: primaryKey, teachRoleKeys, learnRoleKeys };
}

export function calculateRoleMatch(userA: any, userB: any): {
  score: number;
  matchType: 'DIRECT_PERFECT' | 'DIRECT_STRONG' | 'CIRCULAR_CHAIN';
  reasons: string[];
  userARole: string;
  userBRole: string;
  roleSynergyReason: string;
  skillsOfferedToA: string[];
  skillsWantedFromA: string[];
} {
  const roleA = detectRoles(userA);
  const roleB = detectRoles(userB);

  const aTeaches = userA?.userSkills?.filter((s: any) => s.type === 'TEACH') || [];
  const aLearns = userA?.userSkills?.filter((s: any) => s.type === 'LEARN') || [];
  const bTeaches = userB?.userSkills?.filter((s: any) => s.type === 'TEACH') || [];
  const bLearns = userB?.userSkills?.filter((s: any) => s.type === 'LEARN') || [];

  const aLearnIds = new Set(
    aLearns.map((s: any) => (s.skill?.name || s.name || s.skillId || '').toLowerCase())
  );
  const bLearnIds = new Set(
    bLearns.map((s: any) => (s.skill?.name || s.name || s.skillId || '').toLowerCase())
  );

  const skillsBTeachesA = bTeaches.filter((s: any) => {
    const sName = (s.skill?.name || s.name || s.skillId || '').toLowerCase();
    return aLearnIds.has(sName);
  });

  const skillsATeachesB = aTeaches.filter((s: any) => {
    const sName = (s.skill?.name || s.name || s.skillId || '').toLowerCase();
    return bLearnIds.has(sName);
  });

  const hasDirectReciprocalSkills = skillsBTeachesA.length > 0 && skillsATeachesB.length > 0;
  const hasOneWaySkills = skillsBTeachesA.length > 0 || skillsATeachesB.length > 0;

  const bTeachesARoles = roleB.teachRoleKeys.some((k) => roleA.learnRoleKeys.includes(k));
  const aTeachesBRoles = roleA.teachRoleKeys.some((k) => roleB.learnRoleKeys.includes(k));
  const hasReciprocalRoles = bTeachesARoles && aTeachesBRoles;

  const areRolesSynergistic =
    ROLE_SYNERGY[roleA.roleKey]?.includes(roleB.roleKey) ||
    ROLE_SYNERGY[roleB.roleKey]?.includes(roleA.roleKey);

  let score = 15;
  const reasons: string[] = [];
  let roleSynergyReason = '';

  if (hasDirectReciprocalSkills || hasReciprocalRoles) {
    score = 82;
    const skillBonus = Math.min((skillsBTeachesA.length + skillsATeachesB.length) * 5, 16);
    score += skillBonus;
    score = Math.min(score, 98);

    roleSynergyReason = `Мэтч ролей: ${roleA.primaryRole} ↔ ${roleB.primaryRole}`;
    reasons.push(
      `Взаимный обмен ролями: ${roleA.primaryRole} и ${roleB.primaryRole} идеально дополняют друг друга.`
    );
    if (skillsBTeachesA.length > 0) {
      reasons.push(`Обучает вас: ${skillsBTeachesA.map((s: any) => s.skill?.name || s.name).join(', ')}`);
    }
    if (skillsATeachesB.length > 0) {
      reasons.push(`Изучает у вас: ${skillsATeachesB.map((s: any) => s.skill?.name || s.name).join(', ')}`);
    }
  } else if (hasOneWaySkills || bTeachesARoles || aTeachesBRoles) {
    score = 56;
    if (bTeachesARoles || skillsBTeachesA.length > 0) {
      score += 10;
      roleSynergyReason = `Ментор по роли: ${roleB.primaryRole}`;
      reasons.push(`${roleB.primaryRole} готов обучать технологиям из ваших целей.`);
      if (skillsBTeachesA.length > 0) {
        reasons.push(`Компетенции: ${skillsBTeachesA.map((s: any) => s.skill?.name || s.name).join(', ')}`);
      }
    } else {
      score += 6;
      roleSynergyReason = `Запрос на вашу роль: ${roleA.primaryRole}`;
      reasons.push(`Инженер ищет эксперта по вашей роли (${roleA.primaryRole}).`);
    }
    if (areRolesSynergistic) score += 6;
  } else if (areRolesSynergistic) {
    score = 38;
    roleSynergyReason = `Смежные роли: ${roleA.primaryRole} + ${roleB.primaryRole}`;
    reasons.push(`Смежные специализации с потенциалом кросс-функционального обмена.`);
  } else if (roleA.roleKey === roleB.roleKey && roleA.roleKey !== 'GENERAL') {
    score = 44;
    roleSynergyReason = `Коллеги по роли: ${roleA.primaryRole}`;
    reasons.push(`Общая специализация — совместный code review и углубление в стек.`);
  } else {
    score = 14;
    roleSynergyReason = `Специализации: ${roleA.primaryRole} / ${roleB.primaryRole}`;
    reasons.push(`Разные направления разработки с низкой текущей совместимостью ролей.`);
  }

  const matchType = score >= 80 ? 'DIRECT_PERFECT' : 'DIRECT_STRONG';

  return {
    score,
    matchType,
    reasons,
    userARole: roleA.primaryRole,
    userBRole: roleB.primaryRole,
    roleSynergyReason,
    skillsOfferedToA: skillsBTeachesA.map((s: any) => s.skill?.name || s.name),
    skillsWantedFromA: skillsATeachesB.map((s: any) => s.skill?.name || s.name),
  };
}

export async function matchUsers(userId: string): Promise<MatchResult[]> {
  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
      userSkills: {
        include: { skill: true },
      },
    },
  });

  if (!currentUser) return [];

  const myTeaches = currentUser.userSkills.filter((s) => s.type === 'TEACH');
  const myLearns = currentUser.userSkills.filter((s) => s.type === 'LEARN');
  const myLearnSkillIds = new Set(myLearns.map((s) => s.skillId));

  const allCandidates = await prisma.user.findMany({
    where: {
      id: { not: userId },
    },
    include: {
      profile: true,
      userSkills: {
        include: { skill: true },
      },
    },
  });

  const matches: MatchResult[] = [];

  for (const candidate of allCandidates) {
    const matchCalc = calculateRoleMatch(currentUser, candidate);

    matches.push({
      candidateUser: candidate,
      score: matchCalc.score,
      matchType: matchCalc.matchType,
      reasons: matchCalc.reasons,
      skillsOfferedToYou: matchCalc.skillsOfferedToA,
      skillsWantedFromYou: matchCalc.skillsWantedFromA,
      descriptionKeywordsMatched: [],
      candidateRole: matchCalc.userBRole,
      myRole: matchCalc.userARole,
      roleSynergyReason: matchCalc.roleSynergyReason,
    });
  }

  // Multi-hop circular chains
  if (myTeaches.length > 0 && myLearns.length > 0) {
    for (const userB of allCandidates) {
      const aTeachesB = myTeaches.some((s) =>
        userB.userSkills.some((bs) => bs.type === 'LEARN' && bs.skillId === s.skillId)
      );
      if (!aTeachesB) continue;

      for (const userC of allCandidates) {
        if (userC.id === userB.id) continue;
        const bTeachesC = userB.userSkills.some(
          (bs) =>
            bs.type === 'TEACH' &&
            userC.userSkills.some((cs) => cs.type === 'LEARN' && cs.skillId === bs.skillId)
        );
        const cTeachesA = userC.userSkills.some(
          (cs) =>
            cs.type === 'TEACH' &&
            myLearns.some((as) => as.skillId === cs.skillId)
        );

        if (bTeachesC && cTeachesA) {
          const roleB = detectRoles(userB);
          matches.push({
            candidateUser: userB,
            score: 94,
            matchType: 'CIRCULAR_CHAIN',
            reasons: [
              `3-сторонняя цепочка ролей: Вы → ${userB.profile?.name} (${roleB.primaryRole}) → ${userC.profile?.name} → Вы`,
            ],
            skillsOfferedToYou: userC.userSkills
              .filter((s) => s.type === 'TEACH' && myLearnSkillIds.has(s.skillId))
              .map((s) => s.skill.name),
            skillsWantedFromYou: myTeaches
              .filter((s) => userB.userSkills.some((bs) => bs.type === 'LEARN' && bs.skillId === s.skillId))
              .map((s) => s.skill.name),
            descriptionKeywordsMatched: [],
            candidateRole: roleB.primaryRole,
            roleSynergyReason: `Кольцевой обмен ролями (A → B → C)`,
            chainDetails: {
              chainPath: [
                currentUser.profile?.name || 'You',
                userB.profile?.name || 'Peer B',
                userC.profile?.name || 'Peer C',
                currentUser.profile?.name || 'You',
              ],
              exchangeFlow: `${currentUser.profile?.name} → ${userB.profile?.name} → ${userC.profile?.name} → ${currentUser.profile?.name}`,
            },
          });
          break;
        }
      }
    }
  }

  return matches.sort((a, b) => b.score - a.score);
}
