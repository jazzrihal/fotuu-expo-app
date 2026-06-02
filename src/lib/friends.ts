import { supabase } from '@/lib/supabase';
import type { Friend, FriendRequest, SearchProfile } from '@/types/supabase';

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
): Promise<{ data: SearchProfile[] | null; error: string | null }> {
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
