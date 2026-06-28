import { use, useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { Column, Host, RNHostView, Text } from "@expo/ui";
import { Image } from "@/components/image";
import { Stack, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useAuth } from "@/context/auth";
import { TabBarContext } from "@/context/tab-bar";
import { buildLocationLine, formatCapturedAt } from "@/lib/post-display";
import {
  getPost,
  getPostImageUrls,
  getPostViewerEngagement,
  likePost,
  pinPost,
  unlikePost,
  unpinPost,
  type FeedPost,
  type PostDetail,
} from "@/lib/posts";

type FeedPostDetail = (FeedPost | PostDetail) & { imageUrl?: string };

type EngagementOverride = {
  postId: string;
  isLiked: boolean;
  isPinned: boolean;
};

function parsePostParam(
  postParam: string | string[] | undefined,
): FeedPostDetail | null {
  if (!postParam || typeof postParam !== "string") {
    return null;
  }

  try {
    return JSON.parse(postParam) as FeedPostDetail;
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
  const [fetchedPost, setFetchedPost] = useState<FeedPostDetail | null>(null);
  const [fetching, setFetching] = useState(() => !parsePostParam(postParam));
  const [engagementOverride, setEngagementOverride] =
    useState<EngagementOverride | null>(null);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const post = parsedPost ?? fetchedPost;

  const postEngagement = useMemo(
    () =>
      post
        ? getPostViewerEngagement(post)
        : { isLiked: false, isPinned: false },
    [post],
  );

  const hasEngagementOverride =
    engagementOverride != null && engagementOverride.postId === post?.id;
  const isLiked = hasEngagementOverride
    ? engagementOverride.isLiked
    : postEngagement.isLiked;
  const isPinned = hasEngagementOverride
    ? engagementOverride.isPinned
    : postEngagement.isPinned;

  const postId = useMemo(() => {
    if (typeof id === "string" && id.length > 0) {
      return id;
    }

    return post?.id ?? null;
  }, [id, post?.id]);

  useFocusEffect(
    useCallback(() => {
      setIsTabBarHidden(true);
      return () => setIsTabBarHidden(false);
    }, [setIsTabBarHidden]),
  );

  useEffect(() => {
    if (parsedPost || !postId) {
      return;
    }

    let cancelled = false;

    async function loadPost() {
      setFetching(true);

      const { data, error } = await getPost(postId!);
      if (cancelled) {
        return;
      }

      if (error || !data) {
        setFetchedPost(null);
        setFetching(false);
        return;
      }

      const { data: imageUrls } = await getPostImageUrls([
        data.storage_object_path,
      ]);
      if (cancelled) {
        return;
      }

      setFetchedPost({
        ...data,
        imageUrl: imageUrls[data.storage_object_path],
      });
      setFetching(false);
    }

    void loadPost();

    return () => {
      cancelled = true;
    };
  }, [parsedPost, postId]);

  const handleToggleLike = useCallback(async () => {
    if (!postId || actionPending) {
      return;
    }

    const nextLiked = !isLiked;
    setActionError(null);
    setActionPending(true);
    setEngagementOverride({
      postId,
      isLiked: nextLiked,
      isPinned,
    });

    const { error } = nextLiked
      ? await likePost(postId)
      : await unlikePost(postId);

    setActionPending(false);

    if (error) {
      setEngagementOverride(null);
      setActionError(error);
    }
  }, [actionPending, isLiked, isPinned, postId]);

  const handleTogglePin = useCallback(async () => {
    if (!postId || actionPending) {
      return;
    }

    const nextPinned = !isPinned;
    setActionError(null);
    setActionPending(true);
    setEngagementOverride({
      postId,
      isLiked,
      isPinned: nextPinned,
    });

    const { error } = nextPinned
      ? await pinPost(postId)
      : await unpinPost(postId);

    setActionPending(false);

    if (error) {
      setEngagementOverride(null);
      setActionError(error);
    }
  }, [actionPending, isLiked, isPinned, postId]);

  if (fetching && !post) {
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
        <Host style={{ flex: 1, padding: 24 }}>
          <Text>Post not found.</Text>
        </Host>
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
          accessibilityLabel={isLiked ? "Unlike" : "Like"}
          disabled={actionsDisabled}
          icon={isLiked ? "heart.fill" : "heart"}
          selected={isLiked}
          onPress={() => {
            void handleToggleLike();
          }}
        />
        <Stack.Toolbar.Button
          accessibilityLabel={isPinned ? "Unpin" : "Pin"}
          disabled={actionsDisabled}
          icon={isPinned ? "pin.fill" : "pin"}
          selected={isPinned}
          onPress={() => {
            void handleTogglePin();
          }}
        />
      </Stack.Toolbar>
    </>
  );
}
