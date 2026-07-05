import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type MomentListItem =
  Database['public']['Functions']['list_moments']['Returns'][number];

export type CreateMomentInput = {
  occurredAt: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  userId?: string;
};

function rpcErrorMessage(error: { message: string } | null): string | null {
  return error?.message ?? null;
}

export async function listMoments(params?: {
  beforeMomentId?: string;
  beforeOccurredAt?: string;
  limit?: number;
}): Promise<{ data: MomentListItem[] | null; error: string | null }> {
  const { data, error } = await supabase.rpc('list_moments', {
    p_before_moment_id: params?.beforeMomentId,
    p_before_occurred_at: params?.beforeOccurredAt,
    p_limit: params?.limit ?? 30,
  });

  return { data, error: rpcErrorMessage(error) };
}

export async function createMoment(
  input: CreateMomentInput,
): Promise<{ data: { id: string } | null; error: string | null }> {
  const insert: Database['public']['Tables']['moments']['Insert'] = {
    occurred_at: input.occurredAt,
    latitude: input.latitude,
    longitude: input.longitude,
    address: input.address?.trim() || null,
    city: input.city?.trim() || null,
    region: input.region?.trim() || null,
    country: input.country?.trim() || null,
  };

  if (input.userId) {
    insert.user_id = input.userId;
  }

  const { data, error } = await supabase
    .from('moments')
    .insert(insert)
    .select('id')
    .single();

  return { data, error: rpcErrorMessage(error) };
}

export async function deleteMoment(
  momentId: string,
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('moments').delete().eq('id', momentId);
  return { error: rpcErrorMessage(error) };
}
