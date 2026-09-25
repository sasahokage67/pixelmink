import prisma from './prisma';

export interface MatchResult {
  candidateUser: any;
  score: number;
  matchType: 'DIRECT_PERFECT' | 'DIRECT_STRONG' | 'CIRCULAR_CHAIN';
  reasons: string[];
  skillsOfferedToYou: string[];
  skillsWantedFromYou: string[];
  descriptionKeywordsMatched: string[];
  chainDetails?: {
    chainPath: string[];
    exchangeFlow: string;
  };
}

const STOPWORDS = new Set([
  'and', 'the', 'for', 'with', 'from', 'this', 'that', 'have', 'want', 'what', 'like', 'good', 'will',
  'into', 'some', 'your', 'about', 'also', 'over', 'both', 'their', 'been', 'were', 'which', 'where',
  'after', 'before', 'more', 'most', 'very', 'just', 'when', 'then', 'than', 'them', 'these', 'those',
  'и', 'в', 'на', 'с', 'по', 'к', 'для', 'от', 'до', 'из', 'у', 'о', 'об', 'за', 'при', 'что', 'как', 'так'
]);

function extractKeywords(text: string): Set<string> {
  if (!text) return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return new Set(words);
}

/**
 * Calculates deterministic match percentage based on:
 * 1. Skills overlap (TEACH <-> LEARN reciprocal match)
 * 2. Description & Bio semantic keyword intersection
 * 3. Multi-hop circular exchange chains (A -> B -> C -> A)
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

  // Current user's text corpus (bio, skill descriptions, learning goals)
  const myTextCorpus = [
    currentUser.profile?.bio || '',
    ...myTeaches.map((s) => `${s.skill.name} ${s.description}`),
    ...myLearns.map((s) => `${s.skill.name} ${s.learningGoal}`),
  ].join(' ');
  const myKeywords = extractKeywords(myTextCorpus);

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

    const isReciprocal = skillsTheyTeachMe.length > 0 && skillsITeachThem.length > 0;
    const isOneWay = skillsTheyTeachMe.length > 0 || skillsITeachThem.length > 0;

    let score = 25;
    const reasons: string[] = [];

    // --- 1. SKILLS OVERLAP SCORE (max 50 pts) ---
    if (isReciprocal) {
      score += 45;
      reasons.push(
        `Reciprocal: Teaches ${skillsTheyTeachMe.map((s) => s.skill.name).join(', ')} ↔ Wants ${skillsITeachThem.map((s) => s.skill.name).join(', ')}`
      );
    } else if (isOneWay) {
      score += 20;
      if (skillsTheyTeachMe.length > 0) {
        reasons.push(`Teaches ${skillsTheyTeachMe.map((s) => s.skill.name).join(', ')}`);
      } else {
        reasons.push(`Wants ${skillsITeachThem.map((s) => s.skill.name).join(', ')}`);
      }
    }

    // --- 2. DESCRIPTION & BIO OVERLAP SCORE (max 25 pts) ---
    const candTextCorpus = [
      candidate.profile?.bio || '',
      ...candTeaches.map((s) => `${s.skill.name} ${s.description}`),
      ...candLearns.map((s) => `${s.skill.name} ${s.learningGoal}`),
    ].join(' ');
    const candKeywords = extractKeywords(candTextCorpus);

    const commonKeywords: string[] = [];
    myKeywords.forEach((kw) => {
      if (candKeywords.has(kw) && kw.length > 3) {
        commonKeywords.push(kw);
      }
    });

    const keywordBonus = Math.min(commonKeywords.length * 4, 20);
    score += keywordBonus;
    if (commonKeywords.length > 0) {
      reasons.push(`Bio/Goal match: [${commonKeywords.slice(0, 4).join(', ')}]`);
    }

    // Languages overlap
    const myLangs = (currentUser.profile?.languages || '').toLowerCase();
    const candLangs = (candidate.profile?.languages || '').toLowerCase();
    if (myLangs && candLangs && (myLangs.includes('english') && candLangs.includes('english'))) {
      score += 5;
    }

    const finalScore = Math.min(Math.max(score, 40), 98);

    matches.push({
      candidateUser: candidate,
      score: finalScore,
      matchType: isReciprocal ? 'DIRECT_PERFECT' : 'DIRECT_STRONG',
      reasons,
      skillsOfferedToYou: skillsTheyTeachMe.map((s) => s.skill.name),
      skillsWantedFromYou: skillsITeachThem.map((s) => s.skill.name),
      descriptionKeywordsMatched: commonKeywords,
    });
  }

  // --- 3. CIRCULAR CHAINS (A -> B -> C -> A) ---
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
          matches.push({
            candidateUser: userB,
            score: 94,
            matchType: 'CIRCULAR_CHAIN',
            reasons: [
              `3-way chain: You → ${userB.profile?.name} → ${userC.profile?.name} → You`,
            ],
            skillsOfferedToYou: userC.userSkills
              .filter((s) => s.type === 'TEACH' && myLearnSkillIds.has(s.skillId))
              .map((s) => s.skill.name),
            skillsWantedFromYou: myTeaches
              .filter((s) => userB.userSkills.some((bs) => bs.type === 'LEARN' && bs.skillId === s.skillId))
              .map((s) => s.skill.name),
            descriptionKeywordsMatched: [],
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
