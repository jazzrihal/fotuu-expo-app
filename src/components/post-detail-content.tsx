import { StyleSheet, useWindowDimensions } from "react-native";
import {
  Column,
  Host,
  RNHostView,
  Row,
  ScrollView,
  Spacer,
  Text,
} from "@expo/ui";
import { Image } from "@/components/image";
import { PostFeedIconButton } from "@/components/post-feed-icon-button";
import { buildLocationLine, formatCapturedAtAgo } from "@/lib/post-display";
import type { PostDetailTestIDPrefix } from "@/lib/navigation";
import type { PostDetailWithImage } from "@/queries/posts";

type PostDetailTestIDPrefixValue = PostDetailTestIDPrefix | "post";

type PostDetailContentProps = {
  post: PostDetailWithImage;
  testIDPrefix: PostDetailTestIDPrefixValue;
  pageHeight: number;
  bottomInset?: number;
  onAuthorPress: () => void;
  onToggleLike: () => void;
  onTogglePin: () => void;
  isLiked: boolean;
  isPinned: boolean;
  actionsDisabled: boolean;
  actionError: string | null;
};

const CAPTION_LINE_HEIGHT = 22;
const FEED_CAPTION_VISIBLE = 2 * CAPTION_LINE_HEIGHT;
const FEED_METADATA_HEIGHT = 88;

export function PostDetailContent({
  post,
  testIDPrefix,
  pageHeight,
  bottomInset = 0,
  onAuthorPress,
  onToggleLike,
  onTogglePin,
  isLiked,
  isPinned,
  actionsDisabled,
  actionError,
}: PostDetailContentProps) {
  const { width } = useWindowDimensions();

  const locationLine = buildLocationLine({
    address: post.address,
    city: post.city,
    region: post.region,
  });

  const imageHeight = Math.max(
    pageHeight - FEED_METADATA_HEIGHT - FEED_CAPTION_VISIBLE - bottomInset,
    120,
  );

  const metadataBlock = (
    <Column spacing={4} style={styles.metadata}>
      <Row spacing={8} alignment="center">
        <Text
          testID={`${testIDPrefix}-detail-author`}
          textStyle={{ fontWeight: "600" }}
          onPress={onAuthorPress}
        >
          {post.display_name}
        </Text>
        <Spacer flexible />
        <Row spacing={25} alignment="center">
          <PostFeedIconButton
            icon={isLiked ? "heart.fill" : "heart"}
            accessibilityLabel={isLiked ? "Unlike" : "Like"}
            disabled={actionsDisabled}
            onPress={onToggleLike}
          />
          <PostFeedIconButton
            icon={isPinned ? "pin.fill" : "pin"}
            accessibilityLabel={isPinned ? "Unpin" : "Pin"}
            disabled={actionsDisabled}
            onPress={onTogglePin}
          />
        </Row>
      </Row>
      <Text testID={`${testIDPrefix}-detail-date`}>
        {formatCapturedAtAgo(post.captured_at)}
      </Text>
      {locationLine ? (
        <Text testID={`${testIDPrefix}-detail-location`}>{locationLine}</Text>
      ) : null}
      {actionError ? (
        <Text
          testID={`${testIDPrefix}-detail-action-error`}
          textStyle={{ color: "#DC2626" }}
        >
          {actionError}
        </Text>
      ) : null}
    </Column>
  );

  return (
    <Host testID={`${testIDPrefix}-detail`} style={{ height: pageHeight }}>
      <ScrollView showsIndicators={false} style={{ height: pageHeight }}>
        <RNHostView matchContents>
          <Image
            resizeOnTap
            testID={`${testIDPrefix}-detail-image`}
            source={post.imageUrl ? { uri: post.imageUrl } : undefined}
            style={{ width, height: imageHeight }}
          />
        </RNHostView>
        {metadataBlock}
        {post.caption ? (
          <Column style={styles.feedCaption}>
            <Text testID={`${testIDPrefix}-detail-caption`}>
              {post.caption}
            </Text>
          </Column>
        ) : null}
      </ScrollView>
    </Host>
  );
}

const styles = StyleSheet.create({
  metadata: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  feedCaption: {
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
});
