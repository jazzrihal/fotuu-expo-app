import type { LocalPost, LocalPostStatus } from '@/lib/post-db';
import type { PostDetailWithImage } from '@/queries/posts';

export type LocalPostDetailWithImage = PostDetailWithImage & {
  localSyncStatus: LocalPostStatus;
};

export function getLocalSyncStatus(
  post: PostDetailWithImage,
): LocalPostStatus | undefined {
  return (post as LocalPostDetailWithImage).localSyncStatus;
}

/**
 * Adapts a locally-stored post to the shared PostDetailWithImage shape so it
 * can be rendered by PostFeedPager / PostFeedPage without any Supabase data.
 * Remote-only fields are filled with safe defaults.
 */
export function localPostToDetail(lp: LocalPost): LocalPostDetailWithImage {
  return {
    id: lp.id,
    author_id: lp.user_id,
    display_name: lp.display_name ?? '',
    username: '',
    captured_at: lp.captured_at,
    caption: lp.caption,
    privacy_scope: lp.privacy_scope as PostDetailWithImage['privacy_scope'],
    latitude: lp.latitude,
    longitude: lp.longitude,
    address: lp.address,
    city: lp.city,
    region: lp.region,
    country: null,
    storage_bucket_id: '',
    storage_object_path: '',
    created_at: new Date(lp.created_at).toISOString(),
    imageUrl: lp.local_image_uri,
    user_reaction: null,
    is_pinned_by_current_user: false,
    badges: [],
    // FeedPost-only fields (safe defaults)
    distance_meters: null,
    feed_score: null,
    time_delta_seconds: null,
    localSyncStatus: lp.status,
  } as unknown as LocalPostDetailWithImage;
}
