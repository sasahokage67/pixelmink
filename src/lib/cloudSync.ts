import prisma from './prisma';

const SYNC_REGISTRY_ID = 'ff808181a09d98f701a0dd9df95a1d23';
const SYNC_API_URL = `https://api.restful-api.dev/objects/${SYNC_REGISTRY_ID}`;

export interface CloudPeer {
  id: string;
  email: string;
  name: string;
  role?: string;
  bio?: string;
  location?: string;
  languages?: string;
  rating?: number;
  xCredits?: number;
  teachingHours?: number;
  learningHours?: number;
  teachSkills?: string[];
  learnSkills?: string[];
  updatedAt: number;
}

let lastSyncTimestamp = 0;
let cachedCloudPeers: CloudPeer[] = [];
const CACHE_TTL_MS = 3000;

/**
 * Push user profile to global cloud registry so other laptops/devices can discover them.
 */
export async function pushPeerToCloud(peer: CloudPeer): Promise<void> {
  try {
    const res = await fetch(SYNC_API_URL, { cache: 'no-store', signal: AbortSignal.timeout(400) });
    if (!res.ok) return;

    const json = await res.json();
    const existingPeers: CloudPeer[] = json.data?.peers || [];

    // Filter out existing record with same ID or lowercase name
    const cleanName = peer.name.trim().toLowerCase();
    const filtered = existingPeers.filter(
      (p) => p.id !== peer.id && p.name.trim().toLowerCase() !== cleanName
    );

    filtered.push({
      ...peer,
      updatedAt: Date.now(),
    });

    cachedCloudPeers = filtered;

    await fetch(SYNC_API_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(400),
      body: JSON.stringify({
        name: 'pixelmink_global_peers_v1',
        data: {
          version: 1,
          lastUpdated: Date.now(),
          peers: filtered,
        },
      }),
    });
  } catch (err) {
    // Non-critical, ignore timeout or 429
  }
}

/**
 * Synchronize all peers from the global cloud registry into the local Prisma database.
 */
export async function syncPeersFromCloud(force = false): Promise<CloudPeer[]> {
  try {
    const now = Date.now();
    if (!force && now - lastSyncTimestamp < CACHE_TTL_MS && cachedCloudPeers.length > 0) {
      return cachedCloudPeers;
    }
    lastSyncTimestamp = now;

    const res = await fetch(SYNC_API_URL, { cache: 'no-store', signal: AbortSignal.timeout(400) });
    if (!res.ok) return cachedCloudPeers;

    const json = await res.json();
    const cloudPeers: CloudPeer[] = json.data?.peers || [];

    if (!Array.isArray(cloudPeers) || cloudPeers.length === 0) {
      return cachedCloudPeers;
    }

    cachedCloudPeers = cloudPeers;

    // Hydrate or update peers in local database container
    for (const cp of cloudPeers) {
      try {
        if (!cp.id || !cp.name) continue;

        const existing = await prisma.user.findFirst({
          where: {
            OR: [
              { id: cp.id },
              { email: cp.email },
              { profile: { name: { equals: cp.name } } },
            ],
          },
          include: { profile: true },
        });

        if (!existing) {
          // Recreate user in local database container
          const newUser = await prisma.user.create({
            data: {
              id: cp.id,
              email: cp.email || `${cp.name.toLowerCase()}@peer.dev`,
              password: 'persisted_cloud_sync_hash',
              role: cp.role || 'USER',
              profile: {
                create: {
                  name: cp.name,
                  bio: cp.bio || 'Инженер платформы pixelmink',
                  location: cp.location || 'Remote',
                  languages: cp.languages || 'Russian, English',
                  rating: cp.rating ?? 5.0,
                  xCredits: cp.xCredits ?? 5,
                  teachingHours: cp.teachingHours ?? 0,
                  learningHours: cp.learningHours ?? 0,
                },
              },
            },
          });

          // Add teaching skills
          if (cp.teachSkills && Array.isArray(cp.teachSkills)) {
            for (const sName of cp.teachSkills) {
              if (!sName) continue;
              let skill = await prisma.skill.findFirst({ where: { name: sName } });
              if (!skill) {
                skill = await prisma.skill.create({
                  data: { name: sName, category: 'COMPUTER_SCIENCE' },
                });
              }
              await prisma.userSkill.create({
                data: {
                  userId: newUser.id,
                  skillId: skill.id,
                  type: 'TEACH',
                  level: 'INTERMEDIATE',
                },
              }).catch(() => {});
            }
          }

          // Add learning skills
          if (cp.learnSkills && Array.isArray(cp.learnSkills)) {
            for (const sName of cp.learnSkills) {
              if (!sName) continue;
              let skill = await prisma.skill.findFirst({ where: { name: sName } });
              if (!skill) {
                skill = await prisma.skill.create({
                  data: { name: sName, category: 'COMPUTER_SCIENCE' },
                });
              }
              await prisma.userSkill.create({
                data: {
                  userId: newUser.id,
                  skillId: skill.id,
                  type: 'LEARN',
                  level: 'BEGINNER',
                },
              }).catch(() => {});
            }
          }
        } else {
          // User already exists in local DB: update profile fields from cloud registry
          await prisma.profile.upsert({
            where: { userId: existing.id },
            create: {
              userId: existing.id,
              name: cp.name || existing.profile?.name || existing.email.split('@')[0],
              bio: cp.bio || existing.profile?.bio || '',
              location: cp.location || existing.profile?.location || 'Remote',
              languages: cp.languages || existing.profile?.languages || 'Russian, English',
              rating: cp.rating ?? existing.profile?.rating ?? 5.0,
              xCredits: cp.xCredits ?? existing.profile?.xCredits ?? 5,
              teachingHours: cp.teachingHours ?? existing.profile?.teachingHours ?? 0,
              learningHours: cp.learningHours ?? existing.profile?.learningHours ?? 0,
            },
            update: {
              ...(cp.name ? { name: cp.name } : {}),
              ...(cp.bio !== undefined ? { bio: cp.bio } : {}),
              ...(cp.location !== undefined ? { location: cp.location } : {}),
              ...(cp.languages !== undefined ? { languages: cp.languages } : {}),
              ...(cp.rating !== undefined ? { rating: cp.rating } : {}),
              ...(cp.xCredits !== undefined ? { xCredits: cp.xCredits } : {}),
              ...(cp.teachingHours !== undefined ? { teachingHours: cp.teachingHours } : {}),
              ...(cp.learningHours !== undefined ? { learningHours: cp.learningHours } : {}),
            },
          });

          // Sync teach skills if missing locally
          if (cp.teachSkills && Array.isArray(cp.teachSkills)) {
            for (const sName of cp.teachSkills) {
              if (!sName) continue;
              let skill = await prisma.skill.findFirst({ where: { name: sName } });
              if (!skill) {
                skill = await prisma.skill.create({
                  data: { name: sName, category: 'COMPUTER_SCIENCE' },
                });
              }
              const hasSkill = await prisma.userSkill.findFirst({
                where: { userId: existing.id, skillId: skill.id, type: 'TEACH' },
              });
              if (!hasSkill) {
                await prisma.userSkill.create({
                  data: {
                    userId: existing.id,
                    skillId: skill.id,
                    type: 'TEACH',
                    level: 'INTERMEDIATE',
                  },
                }).catch(() => {});
              }
            }
          }

          // Sync learn skills if missing locally
          if (cp.learnSkills && Array.isArray(cp.learnSkills)) {
            for (const sName of cp.learnSkills) {
              if (!sName) continue;
              let skill = await prisma.skill.findFirst({ where: { name: sName } });
              if (!skill) {
                skill = await prisma.skill.create({
                  data: { name: sName, category: 'COMPUTER_SCIENCE' },
                });
              }
              const hasSkill = await prisma.userSkill.findFirst({
                where: { userId: existing.id, skillId: skill.id, type: 'LEARN' },
              });
              if (!hasSkill) {
                await prisma.userSkill.create({
                  data: {
                    userId: existing.id,
                    skillId: skill.id,
                    type: 'LEARN',
                    level: 'BEGINNER',
                  },
                }).catch(() => {});
              }
            }
          }
        }
      } catch (userSyncErr) {
        console.warn(`Could not sync peer ${cp.name}:`, userSyncErr);
      }
    }

    return cloudPeers;
  } catch (err) {
    console.warn('Cloud sync pull failed (using local database):', err);
    return cachedCloudPeers;
  }
}

/**
 * Scan all local users in this instance and push any that are missing to the cloud registry.
 */
export async function broadcastLocalUsersToCloud(): Promise<void> {
  try {
    const localUsers = await prisma.user.findMany({
      include: {
        profile: true,
        userSkills: { include: { skill: true } },
      },
    });

    for (const u of localUsers) {
      if (!u.profile?.name) continue;
      const teachSkills = u.userSkills
        .filter((s) => s.type === 'TEACH')
        .map((s) => s.skill.name);
      const learnSkills = u.userSkills
        .filter((s) => s.type === 'LEARN')
        .map((s) => s.skill.name);

      await pushPeerToCloud({
        id: u.id,
        email: u.email,
        name: u.profile.name,
        role: u.role,
        bio: u.profile.bio,
        location: u.profile.location,
        languages: u.profile.languages,
        rating: u.profile.rating,
        xCredits: u.profile.xCredits,
        teachingHours: u.profile.teachingHours,
        learningHours: u.profile.learningHours,
        teachSkills,
        learnSkills,
        updatedAt: Date.now(),
      });
    }
  } catch (err) {
    console.warn('broadcastLocalUsersToCloud failed:', err);
  }
}
