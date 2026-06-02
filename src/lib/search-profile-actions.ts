import type { SearchProfile } from '@/types/supabase';

export type SearchProfileAction = 'add' | 'pending' | 'friends' | 'respond' | 'none';

/** Maps `search_profiles.relationship_status` (from `database.types.ts`) to UI actions. */
export function searchProfileAction(
  profile: SearchProfile,
  currentUserId: string | undefined,
): SearchProfileAction {
  if (currentUserId && profile.id === currentUserId) return 'none';

  const status = profile.relationship_status.trim().toLowerCase();
  if (status === 'friends' || status === 'accepted') return 'friends';
  if (
    status === 'pending_outgoing' ||
    status === 'outgoing' ||
    status === 'request_sent'
  ) {
    return 'pending';
  }
  if (
    status === 'pending_incoming' ||
    status === 'incoming' ||
    status === 'request_received'
  ) {
    return 'respond';
  }
  if (status === 'none' || status === '') return 'add';
  return 'add';
}

export function searchProfileStatusLabel(
  profile: SearchProfile,
  currentUserId: string | undefined,
): string {
  const action = searchProfileAction(profile, currentUserId);
  switch (action) {
    case 'friends':
      return 'Friends';
    case 'pending':
      return 'Request sent';
    case 'respond':
      return 'Request received';
    default:
      return '';
  }
}
