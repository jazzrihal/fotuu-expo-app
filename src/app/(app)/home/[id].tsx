import { use, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Column, Host, RNHostView, Text } from "@expo/ui";
import { Empty } from "@/components/empty";
import { Image } from "@/components/image";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/auth";
import { TabBarContext } from "@/context/tab-bar";
import { buildLocationLine, formatCapturedAt } from "@/lib/post-display";
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

export default function PostDetailScreen() {
  const { width, height } = useWindowDimensions();
  const { session } = useAuth();
  const { setIsTabBarHidden } = use(TabBarContext);
  const { id, post: postParam } = useLocalSearchParams<{
    id: string;
    post?: string;
  }>();

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

  useFocusEffect(
    useCallback(() => {
      setIsTabBarHidden(true);
      return () => setIsTabBarHidden(false);
    }, [setIsTabBarHidden]),
  );

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
          testID="home-post-not-found"
          title="Post not found"
          description="It may have been removed."
        />
      </>
    );
  }

  const locationLine = buildLocationLine({
    address: post.address,
    city: post.city,
    region: post.region,
  });

  const actionsDisabled = actionPending || !session?.user.id;

  return (
    <>
      <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
      <Host
        testID="home-post-detail"
        style={{ flex: 1 }}
        useViewportSizeMeasurement
      >
        <Column>
          <RNHostView matchContents>
            <Image
              resizeOnTap
              testID="home-post-detail-image"
              source={post.imageUrl ? { uri: post.imageUrl } : undefined}
              style={{ width, height: height * 0.6 }}
            />
          </RNHostView>

          <Column
            spacing={4}
            style={{ paddingHorizontal: 12, paddingVertical: 8 }}
          >
            <Text
              testID="home-post-detail-author"
              textStyle={{ fontWeight: "600" }}
            >
              {post.display_name}
            </Text>
            {locationLine ? (
              <Text testID="home-post-detail-location">{locationLine}</Text>
            ) : null}
            <Text testID="home-post-detail-date">
              {formatCapturedAt(post.captured_at)}
            </Text>
            {actionError ? (
              <Text
                testID="home-post-detail-action-error"
                textStyle={{ color: "#DC2626" }}
              >
                {actionError}
              </Text>
            ) : null}
          </Column>

          <ScrollView
            style={{ flex: 1 }}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 12 }}
          >
            {post.caption ? (
              <Host matchContents>
                <Text testID="home-post-detail-caption">{post.caption}</Text>
              </Host>
            ) : null}
          </ScrollView>
        </Column>
      </Host>

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
