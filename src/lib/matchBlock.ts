import prisma from './prisma';

export interface CloudRelationshipData {
  activeCalls?: any[];
  roomSignals?: Record<string, any[]>;
  matches?: Array<{ userAId: string; userBId: string; status: string; createdAt: number }>;
  blocks?: Array<{ blockerId: string; blockedId: string; createdAt: number }>;
}

// In-memory relationship cache for instant responsiveness
let inMemoryCloudData: CloudRelationshipData = {
  matches: [],
  blocks: [],
};

export async function getCloudRegistry(): Promise<CloudRelationshipData> {
  return inMemoryCloudData;
}

export async function saveCloudRegistry(data: Partial<CloudRelationshipData>): Promise<void> {
  inMemoryCloudData = {
    ...inMemoryCloudData,
    ...data,
  };
}

/**
 * Check if either user has blocked the other.
 */
export async function isUserBlocked(userAId: string, userBId: string): Promise<boolean> {
  if (!userAId || !userBId || userAId === userBId) return false;

  try {
    const blockInDb = await prisma.block.findFirst({
      where: {
        OR: [
          { blockerId: userAId, blockedId: userBId },
          { blockerId: userBId, blockedId: userAId },
        ],
      },
    });
    if (blockInDb) return true;

    // Optional cloud check (failsafe)
    const cloud: CloudRelationshipData = await getCloudRegistry().catch(() => ({}));
    const blocks = cloud.blocks || [];
    return blocks.some(
      (b) =>
        (b.blockerId === userAId && b.blockedId === userBId) ||
        (b.blockerId === userBId && b.blockedId === userAId)
    );
  } catch {
    return false;
  }
}

/**
 * Check if two users have an active, accepted match.
 */
export async function isUserMatched(userAId: string, userBId: string): Promise<boolean> {
  if (!userAId || !userBId || userAId === userBId) return false;

  // If blocked, match is strictly invalid
  if (await isUserBlocked(userAId, userBId)) {
    return false;
  }

  try {
    // 1. Check local DB for accepted match
    const matchInDb = await prisma.match.findFirst({
      where: {
        status: 'ACCEPTED',
        OR: [
          { userAId, userBId },
          { userAId: userBId, userBId: userAId },
        ],
      },
    });
    if (matchInDb) return true;

    // 2. Check if they already share a direct conversation
    const sharedConv = await prisma.conversation.findFirst({
      where: {
        isGroup: false,
        AND: [
          { members: { some: { userId: userAId } } },
          { members: { some: { userId: userBId } } },
        ],
      },
    });
    if (sharedConv) return true;

    // 3. Fallback cloud registry
    const cloud: CloudRelationshipData = await getCloudRegistry().catch(() => ({}));
    const matches = cloud.matches || [];
    return matches.some(
      (m) =>
        ((m.userAId === userAId && m.userBId === userBId) ||
          (m.userAId === userBId && m.userBId === userAId)) &&
        m.status === 'ACCEPTED'
    );
  } catch {
    return false;
  }
}

export type RelationshipStatus = 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'MATCHED' | 'BLOCKED';

/**
 * Get detailed relationship status between the current user and a target user.
 */
export async function getRelationshipStatus(
  currentUserId: string,
  targetUserId: string
): Promise<{
  status: RelationshipStatus;
  isBlockedByMe: boolean;
  isBlockedByPeer: boolean;
}> {
  if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
    return { status: 'NONE', isBlockedByMe: false, isBlockedByPeer: false };
  }

  try {
    // Check blocking first
    const [dbBlockByMe, dbBlockByPeer] = await Promise.all([
      prisma.block.findFirst({ where: { blockerId: currentUserId, blockedId: targetUserId } }),
      prisma.block.findFirst({ where: { blockerId: targetUserId, blockedId: currentUserId } }),
    ]);

    const cloud = await getCloudRegistry();
    const blocks = cloud.blocks || [];
    const cloudBlockByMe = blocks.some(
      (b) => b.blockerId === currentUserId && b.blockedId === targetUserId
    );
    const cloudBlockByPeer = blocks.some(
      (b) => b.blockerId === targetUserId && b.blockedId === currentUserId
    );

    const isBlockedByMe = !!dbBlockByMe || cloudBlockByMe;
    const isBlockedByPeer = !!dbBlockByPeer || cloudBlockByPeer;

    if (isBlockedByMe || isBlockedByPeer) {
      return { status: 'BLOCKED', isBlockedByMe, isBlockedByPeer };
    }

    // Check matches
    const dbMatch = await prisma.match.findFirst({
      where: {
        OR: [
          { userAId: currentUserId, userBId: targetUserId },
          { userAId: targetUserId, userBId: currentUserId },
        ],
      },
    });

    const cloudMatches = cloud.matches || [];
    const cloudMatch = cloudMatches.find(
      (m) =>
        (m.userAId === currentUserId && m.userBId === targetUserId) ||
        (m.userAId === targetUserId && m.userBId === currentUserId)
    );

    const activeMatch = dbMatch || cloudMatch;

    if (activeMatch) {
      if (activeMatch.status === 'ACCEPTED') {
        return { status: 'MATCHED', isBlockedByMe: false, isBlockedByPeer: false };
      }
      if (activeMatch.status === 'PENDING') {
        if (activeMatch.userAId === currentUserId) {
          return { status: 'PENDING_SENT', isBlockedByMe: false, isBlockedByPeer: false };
        } else {
          return { status: 'PENDING_RECEIVED', isBlockedByMe: false, isBlockedByPeer: false };
        }
      }
    }

    return { status: 'NONE', isBlockedByMe: false, isBlockedByPeer: false };
  } catch {
    return { status: 'NONE', isBlockedByMe: false, isBlockedByPeer: false };
  }
}

/**
 * Block a user: persists locally and in cloud, breaks match.
 */
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  try {
    // 1. Save in DB
    await prisma.block.upsert({
      where: {
        blockerId_blockedId: { blockerId, blockedId },
      },
      create: { blockerId, blockedId },
      update: {},
    });

    // 2. Break any existing matches
    await prisma.match.deleteMany({
      where: {
        OR: [
          { userAId: blockerId, userBId: blockedId },
          { userAId: blockedId, userBId: blockerId },
        ],
      },
    }).catch(() => {});

    // 3. Save to cloud
    const cloud = await getCloudRegistry();
    const blocks = (cloud.blocks || []).filter(
      (b) => !(b.blockerId === blockerId && b.blockedId === blockedId)
    );
    blocks.push({ blockerId, blockedId, createdAt: Date.now() });

    const matches = (cloud.matches || []).filter(
      (m) =>
        !(
          (m.userAId === blockerId && m.userBId === blockedId) ||
          (m.userAId === blockedId && m.userBId === blockerId)
        )
    );

    await saveCloudRegistry({ blocks, matches });
  } catch (err) {
    console.error('blockUser error:', err);
  }
}

/**
 * Unblock a user.
 */
export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  try {
    // 1. Delete in DB
    await prisma.block.deleteMany({
      where: { blockerId, blockedId },
    }).catch(() => {});

    // 2. Delete in cloud
    const cloud = await getCloudRegistry();
    const blocks = (cloud.blocks || []).filter(
      (b) => !(b.blockerId === blockerId && b.blockedId === blockedId)
    );
    await saveCloudRegistry({ blocks });
  } catch (err) {
    console.error('unblockUser error:', err);
  }
}

/**
 * Request or Accept a Match.
 */
export async function handleMatchRequest(
  senderId: string,
  targetUserId: string,
  action?: 'request' | 'accept' | 'decline'
): Promise<{ status: string; match: any }> {
  // Defensive check: if targetUserId passed was actually a match record ID
  if (targetUserId) {
    try {
      const matchRecord = await prisma.match.findUnique({ where: { id: targetUserId } });
      if (matchRecord) {
        targetUserId = matchRecord.userAId === senderId ? matchRecord.userBId : matchRecord.userAId;
      }
    } catch {}
  }

  // If blocked, cannot match
  if (await isUserBlocked(senderId, targetUserId)) {
    throw new Error('Невозможно установить мэтч с заблокированным пользователем');
  }

  // Check if any existing match between these two users exists
  const existingMatch = await prisma.match.findFirst({
    where: {
      OR: [
        { userAId: targetUserId, userBId: senderId },
        { userAId: senderId, userBId: targetUserId },
      ],
    },
  });

  let match;
  let finalStatus = 'PENDING';

  if (action === 'decline') {
    await prisma.match.deleteMany({
      where: {
        OR: [
          { userAId: senderId, userBId: targetUserId },
          { userAId: targetUserId, userBId: senderId },
        ],
      },
    }).catch(() => {});

    try {
      const cloud: CloudRelationshipData = await getCloudRegistry().catch(() => ({}));
      const matches = (cloud.matches || []).filter(
        (m) =>
          !(
            (m.userAId === senderId && m.userBId === targetUserId) ||
            (m.userAId === targetUserId && m.userBId === senderId)
          )
      );
      await saveCloudRegistry({ matches }).catch(() => {});
    } catch {}
    return { status: 'NONE', match: null };
  }

  // If any match already exists OR action === 'accept'
  if (existingMatch || action === 'accept') {
    finalStatus = 'ACCEPTED';
    if (existingMatch) {
      match = await prisma.match.update({
        where: { id: existingMatch.id },
        data: { status: 'ACCEPTED' },
      });
    } else {
      match = await prisma.match.create({
        data: {
          userAId: senderId,
          userBId: targetUserId,
          status: 'ACCEPTED',
          reason: 'Mutual skill exchange match',
        },
      });
    }

    // Auto-create 1-on-1 chat conversation so accepted match appears in Chats immediately
    try {
      const existingConv = await prisma.conversation.findFirst({
        where: {
          isGroup: false,
          AND: [
            { members: { some: { userId: senderId } } },
            { members: { some: { userId: targetUserId } } },
          ],
        },
      });

      if (!existingConv) {
        await prisma.conversation.create({
          data: {
            isGroup: false,
            members: {
              create: [{ userId: senderId }, { userId: targetUserId }],
            },
          },
        });
      }
    } catch (convErr) {
      console.error('Error auto-creating conversation on accept:', convErr);
    }

    // Real-time broadcast to peer via ntfy so their client updates in real time!
    try {
      fetch(`https://ntfy.sh/pixelmink_user_${targetUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'match_accepted',
          partnerId: senderId,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
  } else {
    // New pending request from sender to target
    match = await prisma.match.upsert({
      where: {
        userAId_userBId: {
          userAId: senderId,
          userBId: targetUserId,
        },
      },
      create: {
        userAId: senderId,
        userBId: targetUserId,
        status: 'PENDING',
        reason: 'Direct match request',
      },
      update: { status: 'PENDING' },
    });

    // Notify peer of incoming match request
    try {
      fetch(`https://ntfy.sh/pixelmink_user_${targetUserId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'match_requested',
          fromUserId: senderId,
          timestamp: Date.now(),
        }),
      }).catch(() => {});
    } catch {}
  }

  // Failsafe sync match to cloud
  try {
    const cloud: CloudRelationshipData = await getCloudRegistry().catch(() => ({}));
    const filteredMatches = (cloud.matches || []).filter(
      (m) =>
        !(
          (m.userAId === senderId && m.userBId === targetUserId) ||
          (m.userAId === targetUserId && m.userBId === senderId)
        )
    );
    filteredMatches.push({
      userAId: match.userAId,
      userBId: match.userBId,
      status: finalStatus,
      createdAt: Date.now(),
    });
    await saveCloudRegistry({ matches: filteredMatches }).catch(() => {});
  } catch {}

  return { status: finalStatus, match };
}
