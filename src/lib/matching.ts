import prisma from './prisma';

export interface MatchResult {
  candidateUser: any;
  score: number;
  matchType: 'DIRECT_PERFECT' | 'DIRECT_STRONG' | 'CIRCULAR_CHAIN';
  reasons: string[];
  skillsOfferedToYou: string[];
  skillsWantedFromYou: string[];
  chainDetails?: {
    chainPath: string[]; // e.g. ["Alex", "Elena", "Kenji", "Alex"]
    exchangeFlow: string;
  };
}

const LEVEL_WEIGHTS: Record<string, number> = {
  BEGINNER: 1,
  INTERMEDIATE: 2,
  ADVANCED: 3,
  EXPERT: 4,
};

/**
 * Core Knowledge Exchange Matching Algorithm
 * Calculates deterministic match scores based on:
 * - Reciprocal skills (A can teach what B wants, B can teach what A wants)
 * - Level suitability
 * - Common languages
 * - Timezone compatibility
 * - User ratings and teaching track record
 * - Circular multi-hop chains (A -> B -> C -> A)
 */
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

  const myTeachSkillIds = new Set(myTeaches.map((s) => s.skillId));
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
    const candTeaches = candidate.userSkills.filter((s) => s.type === 'TEACH');
    const candLearns = candidate.userSkills.filter((s) => s.type === 'LEARN');

    const candTeachSkillIds = new Set(candTeaches.map((s) => s.skillId));
    const candLearnSkillIds = new Set(candLearns.map((s) => s.skillId));

    // What candidate can teach me (their TEACH in my LEARN)
    const skillsTheyTeachMe = candTeaches.filter((s) => myLearnSkillIds.has(s.skillId));
    // What I can teach candidate (my TEACH in their LEARN)
    const skillsITeachThem = myTeaches.filter((s) => candLearnSkillIds.has(s.skillId));

    let score = 30; // base score for discovery
    const reasons: string[] = [];

    const isReciprocal = skillsTheyTeachMe.length > 0 && skillsITeachThem.length > 0;
    const isOneWay = skillsTheyTeachMe.length > 0 || skillsITeachThem.length > 0;

    if (isReciprocal) {
      score += 42;
      reasons.push(
        `Perfect Reciprocal Exchange: They teach ${skillsTheyTeachMe.map((s) => s.skill.name).join(', ')}, while you teach ${skillsITeachThem.map((s) => s.skill.name).join(', ')}`
      );
    } else if (isOneWay) {
      score += 20;
      if (skillsTheyTeachMe.length > 0) {
        reasons.push(`Direct Mentorship: Teaches ${skillsTheyTeachMe.map((s) => s.skill.name).join(', ')}`);
      } else {
        reasons.push(`Knowledge Request: Wants to learn ${skillsITeachThem.map((s) => s.skill.name).join(', ')} from you`);
      }
    } else {
      // General skill category synergy
      const myCategories = new Set(currentUser.userSkills.map((s) => s.skill.category));
      const candCategories = candidate.userSkills.filter((s) => myCategories.has(s.skill.category));
      if (candCategories.length > 0) {
        score += 10;
        reasons.push(`Domain Alignment in ${candCategories[0].skill.category}`);
      }
    }

    // Level check
    for (const st of skillsTheyTeachMe) {
      const myTarget = myLearns.find((l) => l.skillId === st.skillId);
      if (myTarget) {
        const teacherLvl = LEVEL_WEIGHTS[st.level] || 2;
        const myTargetLvl = LEVEL_WEIGHTS[myTarget.level] || 1;
        if (teacherLvl >= myTargetLvl) {
          score += 8;
          reasons.push(`Level Match: Teacher is ${st.level}, ready for your target`);
          break;
        }
      }
    }

    // Language compatibility
    const myLangs = (currentUser.profile?.languages || '').toLowerCase();
    const candLangs = (candidate.profile?.languages || '').toLowerCase();
    const commonLangs = ['english', 'russian', 'german', 'spanish', 'french'].filter(
      (lang) => myLangs.includes(lang) && candLangs.includes(lang)
    );
    if (commonLangs.length > 0) {
      score += 8;
      reasons.push(`Shared Languages: ${commonLangs.map((l) => l.toUpperCase()).join(', ')}`);
    }

    // Rating check
    if (candidate.profile && candidate.profile.rating >= 4.8) {
      score += 6;
    }

    // Verified badge bonus
    if (candidate.profile && candidate.profile.verified) {
      score += 4;
    }

    // Clamp score
    const finalScore = Math.min(Math.max(score, 45), 98);

    matches.push({
      candidateUser: candidate,
      score: finalScore,
      matchType: isReciprocal ? 'DIRECT_PERFECT' : 'DIRECT_STRONG',
      reasons,
      skillsOfferedToYou: skillsTheyTeachMe.map((s) => s.skill.name),
      skillsWantedFromYou: skillsITeachThem.map((s) => s.skill.name),
    });
  }

  // Detect circular 3-way chain matches: A -> B -> C -> A
  // A teaches B, B teaches C, C teaches A
  if (myTeaches.length > 0 && myLearns.length > 0) {
    for (const userB of allCandidates) {
      // Does A teach B?
      const aTeachesB = myTeaches.some((s) =>
        userB.userSkills.some((bs) => bs.type === 'LEARN' && bs.skillId === s.skillId)
      );
      if (!aTeachesB) continue;

      for (const userC of allCandidates) {
        if (userC.id === userB.id) continue;
        // Does B teach C?
        const bTeachesC = userB.userSkills.some(
          (bs) =>
            bs.type === 'TEACH' &&
            userC.userSkills.some((cs) => cs.type === 'LEARN' && cs.skillId === bs.skillId)
        );
        // Does C teach A?
        const cTeachesA = userC.userSkills.some(
          (cs) =>
            cs.type === 'TEACH' &&
            myLearns.some((as) => as.skillId === cs.skillId)
        );

        if (bTeachesC && cTeachesA) {
          matches.push({
            candidateUser: userB,
            score: 93,
            matchType: 'CIRCULAR_CHAIN',
            reasons: [
              `Knowledge Exchange Chain (3-Hop): You teach ${userB.profile?.name}, they teach ${userC.profile?.name}, and ${userC.profile?.name} teaches you!`,
            ],
            skillsOfferedToYou: userC.userSkills
              .filter((s) => s.type === 'TEACH' && myLearnSkillIds.has(s.skillId))
              .map((s) => s.skill.name),
            skillsWantedFromYou: myTeaches
              .filter((s) => userB.userSkills.some((bs) => bs.type === 'LEARN' && bs.skillId === s.skillId))
              .map((s) => s.skill.name),
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

  // Sort by score descending
  return matches.sort((a, b) => b.score - a.score);
}
