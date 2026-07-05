import { useMemo } from "react";
import { ActivityIndicator } from "react-native";
import { Host } from "@expo/ui";
import { Empty } from "@/components/empty";
import { PostFeedPager } from "@/components/post-feed-pager";
import { Stack, useLocalSearchParams } from "expo-router";
import {
  parsePostDetailTestIDPrefix,
  parsePostFeedSource,
} from "@/lib/navigation";
import { localPostToDetail } from "@/lib/local-post-adapter";
import type { LocalPost } from "@/lib/post-db";
import {
  usePostFeedPosts,
  usePostQuery,
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

function parseLocalPostParam(
  param: string | string[] | undefined,
): LocalPost | null {
  if (!param || typeof param !== "string") {
    return null;
  }

  try {
    return JSON.parse(param) as LocalPost;
  } catch {
    return null;
  }
}

export function PostDetailScreen() {
  const { id, post: postParam, testIDPrefix: testIDPrefixParam, feedSource: feedSourceParam, localPost: localPostParam } =
    useLocalSearchParams<{
      id: string;
      post?: string;
      testIDPrefix?: string;
      feedSource?: string;
      localPost?: string;
    }>();
  const testIDPrefix = parsePostDetailTestIDPrefix(testIDPrefixParam);
  const feedSource = useMemo(
    () => parsePostFeedSource(feedSourceParam),
    [feedSourceParam],
  );

  const parsedPost = useMemo(() => parsePostParam(postParam), [postParam]);
  const parsedLocalPost = useMemo(() => parseLocalPostParam(localPostParam), [localPostParam]);

  const postId = useMemo(() => {
    if (typeof id === "string" && id.length > 0) {
      return id;
    }
    return parsedPost?.id ?? parsedLocalPost?.id ?? null;
  }, [id, parsedPost?.id, parsedLocalPost?.id]);

  // Always call hooks unconditionally (Rules of Hooks).
  const feedQuery = usePostFeedPosts(parsedLocalPost ? null : feedSource);

  const fallbackPostQuery = usePostQuery(parsedLocalPost ? null : postId, {
    placeholderData: parsedPost ?? undefined,
    enabled: !feedSource && !parsedLocalPost,
  });

  const screenOptions = (
    <Stack.Screen options={{ title: "", headerLargeTitle: false }} />
  );

  // Local-only mode: bypass Supabase entirely.
  if (parsedLocalPost) {
    const adapted = localPostToDetail(parsedLocalPost);
    return (
      <>
        {screenOptions}
        <PostFeedPager
          posts={[adapted]}
          testIDPrefix={testIDPrefix}
          testID={`${testIDPrefix}-feed-pager`}
          initialIndex={0}
          includeTabBarInset={false}
          isLocalOnly
        />
      </>
    );
  }

  if (feedSource && feedQuery) {
    if (feedQuery.isPending && feedQuery.posts.length === 0) {
      return (
        <>
          {screenOptions}
          <Host
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator />
          </Host>
        </>
      );
    }

    if (feedQuery.error && feedQuery.posts.length === 0) {
      return (
        <>
          {screenOptions}
          <Empty
            testID={`${testIDPrefix}-feed-error`}
            title="Failed to load feed"
            description={feedQuery.error.message}
          />
        </>
      );
    }

    const initialIndex = postId
      ? feedQuery.posts.findIndex((post) => post.id === postId)
      : -1;

    if (feedQuery.posts.length > 0 && initialIndex === -1) {
      return (
        <>
          {screenOptions}
          <Empty
            testID={`${testIDPrefix}-not-found`}
            title="Post not found"
            description="It may have been removed."
          />
        </>
      );
    }

    if (feedQuery.posts.length > 0 && initialIndex >= 0) {
      return (
        <>
          {screenOptions}
          <PostFeedPager
            posts={feedQuery.posts}
            testIDPrefix={testIDPrefix}
            testID={`${testIDPrefix}-feed-pager`}
            initialIndex={initialIndex}
            includeTabBarInset={false}
            refreshing={feedQuery.isRefetching && !feedQuery.isPending}
            onRefresh={() => {
              void feedQuery.refetch();
            }}
          />
        </>
      );
    }
  }

  const fallbackPost = fallbackPostQuery.data;

  if (fallbackPostQuery.isPending && !fallbackPost) {
    return (
      <>
        {screenOptions}
        <Host
          style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
        >
          <ActivityIndicator />
        </Host>
      </>
    );
  }

  if (!fallbackPost) {
    return (
      <>
        {screenOptions}
        <Empty
          testID={`${testIDPrefix}-not-found`}
          title="Post not found"
          description="It may have been removed."
        />
      </>
    );
  }

  return (
    <>
      {screenOptions}
      <PostFeedPager
        posts={[fallbackPost]}
        testIDPrefix={testIDPrefix}
        testID={`${testIDPrefix}-feed-pager`}
        initialIndex={0}
        includeTabBarInset={false}
      />
    </>
  );
}
