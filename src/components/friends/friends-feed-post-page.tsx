import { memo, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { PostDetailContent } from "@/components/post-detail-content";
import { useAuth } from "@/context/auth";
import { openUserProfile } from "@/lib/navigation";
import {
  getPostViewerEngagement,
  useToggleLikeMutation,
  useTogglePinMutation,
  type FriendsPostWithImage,
} from "@/queries/posts";

type FriendsFeedPostPageProps = {
  post: FriendsPostWithImage;
  pageHeight: number;
  bottomInset: number;
};

export const FriendsFeedPostPage = memo(function FriendsFeedPostPage({
  post,
  pageHeight,
  bottomInset,
}: FriendsFeedPostPageProps) {
  const router = useRouter();
  const { session } = useAuth();

  const likeMutation = useToggleLikeMutation(post.id);
  const pinMutation = useTogglePinMutation(post.id);

  const postEngagement = useMemo(
    () => getPostViewerEngagement(post),
    [post],
  );

  const actionPending = likeMutation.isPending || pinMutation.isPending;
  const actionError =
    likeMutation.error?.message ?? pinMutation.error?.message ?? null;
  const actionsDisabled = actionPending || !session?.user.id;

  const handleToggleLike = useCallback(() => {
    if (actionPending) {
      return;
    }
    likeMutation.mutate(!postEngagement.isLiked);
  }, [actionPending, likeMutation, postEngagement.isLiked]);

  const handleTogglePin = useCallback(() => {
    if (actionPending) {
      return;
    }
    pinMutation.mutate(!postEngagement.isPinned);
  }, [actionPending, pinMutation, postEngagement.isPinned]);

  const openAuthorProfile = useCallback(() => {
    openUserProfile(router, session?.user.id, {
      id: post.author_id,
      displayName: post.display_name,
      username: post.username,
    });
  }, [post.author_id, post.display_name, post.username, router, session?.user.id]);

  return (
    <PostDetailContent
      post={post}
      testIDPrefix="friends-post"
      layout="feed"
      pageHeight={pageHeight}
      bottomInset={bottomInset}
      onAuthorPress={openAuthorProfile}
      onToggleLike={handleToggleLike}
      onTogglePin={handleTogglePin}
      isLiked={postEngagement.isLiked}
      isPinned={postEngagement.isPinned}
      actionsDisabled={actionsDisabled}
      actionError={actionError}
    />
  );
});
