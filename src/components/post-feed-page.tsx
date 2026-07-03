import { memo, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { PostDetailContent } from "@/components/post-detail-content";
import { useAuth } from "@/context/auth";
import {
  openUserProfile,
  type PostDetailTestIDPrefix,
} from "@/lib/navigation";
import {
  getPostViewerEngagement,
  useToggleLikeMutation,
  useTogglePinMutation,
  type PostDetailWithImage,
} from "@/queries/posts";

type PostFeedPageProps = {
  post: PostDetailWithImage;
  testIDPrefix: PostDetailTestIDPrefix | "post";
  pageHeight: number;
  bottomInset: number;
};

export const PostFeedPage = memo(function PostFeedPage({
  post,
  testIDPrefix,
  pageHeight,
  bottomInset,
}: PostFeedPageProps) {
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
      testIDPrefix={testIDPrefix}
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
