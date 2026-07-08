import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export const MAX_FRIENDS = 150;

export type Friend = Database['public']['Functions']['list_friends']['Returns'][number];
export type FriendRequest =
  Database['public']['Functions']['list_incoming_friend_requests']['Returns'][number];
export type ProfileSearchResult =
  Database['public']['Functions']['search_profiles']['Returns'][number];

function rpcErrorMessage(error: { message: string } | null): string | null {
  return error?.message ?? null;
}

export async function listFriends(): Promise<{
  data: Friend[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('list_friends');
  return { data, error: rpcErrorMessage(error) };
}

export async function listIncomingFriendRequests(): Promise<{
  data: FriendRequest[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('list_incoming_friend_requests');
  return { data, error: rpcErrorMessage(error) };
}

export async function listOutgoingFriendRequests(): Promise<{
  data: FriendRequest[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('list_outgoing_friend_requests');
  return { data, error: rpcErrorMessage(error) };
}

export async function searchProfiles(
  query: string,
  limit = 20,
): Promise<{ data: ProfileSearchResult[] | null; error: string | null }> {
  const { data, error } = await supabase.rpc('search_profiles', {
    p_query: query.trim(),
    p_limit: limit,
  });
  return { data, error: rpcErrorMessage(error) };
}

export async function sendFriendRequest(
  addresseeId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('send_friend_request', {
    p_addressee_id: addresseeId,
  });
  return { error: rpcErrorMessage(error) };
}

export async function respondToFriendRequest(
  requestId: string,
  accept: boolean,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('respond_to_friend_request', {
    p_request_id: requestId,
    p_accept: accept,
  });
  return { error: rpcErrorMessage(error) };
}

export async function cancelFriendRequest(
  requestId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('cancel_friend_request', {
    p_request_id: requestId,
  });
  return { error: rpcErrorMessage(error) };
}

export async function removeFriend(
  friendId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('remove_friend', {
    p_friend_id: friendId,
  });
  return { error: rpcErrorMessage(error) };
}

export async function getRelationshipStatus(
  otherUserId: string,
): Promise<{ data: string | null; error: string | null }> {
  const userId = (await supabase.auth.getUser()).data.user?.id;
  if (!userId) {
    return { data: null, error: 'Not signed in' };
  }

  const { data, error } = await supabase.rpc('get_relationship_status', {
    p_user_id: userId,
    p_other_id: otherUserId,
  });

  return { data, error: rpcErrorMessage(error) };
}
