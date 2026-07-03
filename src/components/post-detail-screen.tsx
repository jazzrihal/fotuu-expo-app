import { useCallback, useMemo } from "react";
import { ActivityIndicator } from "react-native";
import { Host } from "@expo/ui";
import { Empty } from "@/components/empty";
import { PostDetailContent } from "@/components/post-detail-content";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useAuth } from "@/context/auth";
import {
  openUserProfile,
  parsePostDetailTestIDPrefix,
} from "@/lib/navigation";
import {
  getPostViewerEngagement,
  usePostQuery,
  useToggleLikeMutation,
  useTogglePinMutation,
  type PostDetailWithImage,
} from "@/queries/posts";

function parsePostParam(
  postParam: string | string[] | undefined,
): PostDetailWithImage | null {
  if (!postParam || typeof postParam !== "string") {
    return null;
  }

  try {
    return JSON.parse(postParam) as PostDetailWithImage;
  } catch {
    return null;
  }
}

export function PostDetailScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const { id, post: postParam, testIDPrefix: testIDPrefixParam } =
    useLocalSearchParams<{
      id: string;
      post?: string;
      testIDPrefix?: string;
    }>();
  const testIDPrefix = parsePostDetailTestIDPrefix(testIDPrefixParam);

  const parsedPost = useMemo(() => parsePostParam(postParam), [postParam]);

  const postId = useMemo(() => {
    if (typeof id === "string" && id.length > 0) {
      return id;
    }
    return parsedPost?.id ?? null;
  }, [id, parsedPost?.id]);

  const postQuery = usePostQuery(postId, {
    placeholderData: parsedPost ?? undefined,
  });

  const likeMutation = useToggleLikeMutation(postId);
  const pinMutation = useTogglePinMutation(postId);

  const post = postQuery.data;
  const postEngagement = useMemo(
    () =>
      post
        ? getPostViewerEngagement(post)
        : { isLiked: false, isPinned: false },
    [post],
  );

  const actionPending = likeMutation.isPending || pinMutation.isPending;
  const actionError =
    likeMutation.error?.message ?? pinMutation.error?.message ?? null;

  const handleToggleLike = useCallback(() => {
    if (!postId || actionPending) {
      return;
    }
    likeMutation.mutate(!postEngagement.isLiked);
  }, [actionPending, likeMutation, postEngagement.isLiked, postId]);

  const handleTogglePin = useCallback(() => {
    if (!postId || actionPending) {
      return;
    }
    pinMutation.mutate(!postEngagement.isPinned);
  }, [actionPending, pinMutation, postEngagement.isPinned, postId]);

  const openAuthorProfile = useCallback(() => {
    if (!post?.author_id) {
      return;
    }

    openUserProfile(router, session?.user.id, {
      id: post.author_id,
      displayName: post.display_name,
      username: post.username,
    });
  }, [post, router, session?.user.id]);

  if (postQuery.isPending && !post) {
    return (
      <>
        <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
        <Host
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator />
        </Host>
      </>
    );
  }

  if (!post) {
    return (
      <>
        <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
        <Empty
          testID={`${testIDPrefix}-not-found`}
          title="Post not found"
          description="It may have been removed."
        />
      </>
    );
  }

  const actionsDisabled = actionPending || !session?.user.id;

  return (
    <>
      <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
      <PostDetailContent
        post={post}
        testIDPrefix={testIDPrefix}
        layout="detail"
        onAuthorPress={openAuthorProfile}
        onToggleLike={handleToggleLike}
        onTogglePin={handleTogglePin}
        isLiked={postEngagement.isLiked}
        isPinned={postEngagement.isPinned}
        actionsDisabled={actionsDisabled}
        actionError={actionError}
      />

      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.Button
          accessibilityLabel={postEngagement.isLiked ? "Unlike" : "Like"}
          disabled={actionsDisabled}
          icon={postEngagement.isLiked ? "heart.fill" : "heart"}
          selected={postEngagement.isLiked}
          onPress={handleToggleLike}
        />
        <Stack.Toolbar.Button
          accessibilityLabel={postEngagement.isPinned ? "Unpin" : "Pin"}
          disabled={actionsDisabled}
          icon={postEngagement.isPinned ? "pin.fill" : "pin"}
          selected={postEngagement.isPinned}
          onPress={handleTogglePin}
        />
      </Stack.Toolbar>
    </>
  );
}
