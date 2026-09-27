type ConversationMember = { userId?: string; user?: unknown };
type ConversationLike = { id?: string; isGroup?: boolean; members?: ConversationMember[] };

export function isUsableConversation(conversation: ConversationLike | null | undefined, currentUserId: string) {
  if (!conversation?.id || !Array.isArray(conversation.members) || !currentUserId) return false;
  if (!conversation.members.some((member) => member.userId === currentUserId)) return false;
  if (conversation.isGroup) return true;
  return conversation.members.length === 2 && conversation.members.some(
    (member) => member.userId !== currentUserId && Boolean(member.user)
  );
}

export function directConversationId(firstUserId: string, secondUserId: string) {
  return `direct_${[firstUserId, secondUserId].sort().join('_')}`;
}
