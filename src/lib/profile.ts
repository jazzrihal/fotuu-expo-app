import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type UserProfile =
  Database['public']['Tables']['user_profiles']['Row'];

function rpcErrorMessage(error: { message: string } | null): string | null {
  return error?.message ?? null;
}

export async function getUserProfile(userId: string): Promise<{
  data: Pick<UserProfile, 'display_name'> | null;
  error: string | null;
}> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('display_name')
    .eq('id', userId)
    .maybeSingle();

  return { data, error: rpcErrorMessage(error) };
}
