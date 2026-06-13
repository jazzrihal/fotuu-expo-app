import { supabase } from '@/lib/supabase';
import type { Database } from '@/lib/database.types';

export type VisiblePost =
  Database['public']['Functions']['list_visible_posts']['Returns'][number];

export type PostPrivacyScope = Database['public']['Enums']['post_privacy_scope'];

const POST_IMAGES_BUCKET = 'post-images';
const SIGNED_URL_TTL_SECONDS = 3600;

function rpcErrorMessage(error: { message: string } | null): string | null {
  return error?.message ?? null;
}

function randomUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = (Math.random() * 16) | 0;
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function toPostgisPoint(longitude: number, latitude: number): string {
  return `POINT(${longitude} ${latitude})`;
}

export function buildPostImagePath(userId: string, extension = 'jpg'): string {
  return `${userId}/${randomUuid()}.${extension}`;
}

export async function uploadPostImage(
  localUri: string,
  userId: string,
): Promise<{ path: string | null; error: string | null }> {
  const path = buildPostImagePath(userId);

  try {
    // fetch().blob() fails on React Native/Hermes for file:// URIs because internally
    // the response body is an ArrayBuffer and Hermes forbids new Blob([arrayBuffer]).
    // XHR with responseType='arraybuffer' reads the file directly without creating a Blob,
    // and Supabase storage accepts ArrayBuffer as a valid upload body.
    const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.responseType = 'arraybuffer';
      xhr.onload = () => resolve(xhr.response as ArrayBuffer);
      xhr.onerror = () => reject(new Error('Failed to read image file'));
      xhr.open('GET', localUri);
      xhr.send();
    });

    const { error } = await supabase.storage.from(POST_IMAGES_BUCKET).upload(path, arrayBuffer, {
      contentType: 'image/jpeg',
      upsert: false,
    });

    if (error) {
      return { path: null, error: error.message };
    }

    return { path, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to upload image';
    return { path: null, error: message };
  }
}

export type CreatePostInput = {
  storagePath: string;
  capturedAt: string;
  caption?: string | null;
  privacyScope: PostPrivacyScope;
  latitude?: number;
  longitude?: number;
};

export async function createPost(
  input: CreatePostInput,
): Promise<{ data: { id: string } | null; error: string | null }> {
  const insert: Database['public']['Tables']['posts']['Insert'] = {
    storage_object_path: input.storagePath,
    captured_at: input.capturedAt,
    caption: input.caption?.trim() || null,
    privacy_scope: input.privacyScope,
  };

  if (
    input.latitude !== undefined &&
    input.longitude !== undefined &&
    Number.isFinite(input.latitude) &&
    Number.isFinite(input.longitude)
  ) {
    insert.location = toPostgisPoint(input.longitude, input.latitude);
  }

  const { data, error } = await supabase
    .from('posts')
    .insert(insert)
    .select('id')
    .single();

  return { data, error: rpcErrorMessage(error) };
}

export async function listVisiblePosts(before?: string): Promise<{
  data: VisiblePost[] | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc('list_visible_posts', {
    p_limit: 30,
    p_before: before ?? undefined,
  });

  return { data, error: rpcErrorMessage(error) };
}

export async function getPostImageUrls(
  paths: string[],
): Promise<{ data: Record<string, string>; error: string | null }> {
  if (paths.length === 0) {
    return { data: {}, error: null };
  }

  const { data, error } = await supabase.storage
    .from(POST_IMAGES_BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);

  if (error) {
    return { data: {}, error: error.message };
  }

  const urls: Record<string, string> = {};
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) {
      urls[item.path] = item.signedUrl;
    }
  }

  return { data: urls, error: null };
}
