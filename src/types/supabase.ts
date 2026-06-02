import type { Database, Enums } from '@/lib/database.types';

type PublicSchema = Database['public'];
type PublicFunctions = PublicSchema['Functions'];

/** Row from `list_friends` (see `database.types.ts`). */
export type Friend = PublicFunctions['list_friends']['Returns'][number];

/** Row from `list_incoming_friend_requests` / `list_outgoing_friend_requests`. */
export type FriendRequest =
  PublicFunctions['list_incoming_friend_requests']['Returns'][number];

/** Row from `search_profiles` (includes `relationship_status`). */
export type SearchProfile = PublicFunctions['search_profiles']['Returns'][number];

/** `friendship_status` enum on `friendship_requests`. */
export type FriendshipStatus = Enums<'friendship_status'>;
