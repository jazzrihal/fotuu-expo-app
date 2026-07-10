import { StyleSheet, useWindowDimensions, View } from "react-native";
import {
  Button,
  Column,
  Host,
  RNHostView,
  Row,
  ScrollView,
  Spacer,
  Text,
} from "@expo/ui";
import { ZoomableImage } from "@/components/zoomable-image";
import { LocalPostSyncBadge } from "@/components/local-post-sync-badge";
import { PostFeedIconButton } from "@/components/post-feed-icon-button";
import { buildLocationLine, formatCapturedAtAgo } from "@/lib/post-display";
import type { PostDetailTestIDPrefix } from "@/lib/navigation";
import type { LocalPostStatus } from "@/lib/post-db";
import type { PostDetailWithImage } from "@/queries/posts";
import type { LocalPost } from "@/lib/post-manager";

type PostDetailTestIDPrefixValue = PostDetailTestIDPrefix | "post";

const SYNC_STATUS_LABELS: Record<string, string> = {
  local: 'Saved locally',
  queued: 'Waiting to upload',
  uploading: 'Uploading…',
  failed: 'Upload failed',
};

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
  localPost?: LocalPost | null;
  onUploadToCloud?: () => void;
  isLocalOnly?: boolean;
  localSyncStatus?: LocalPostStatus;
  onExploreNearby?: () => void;
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
  localPost,
  onUploadToCloud,
  isLocalOnly = false,
  localSyncStatus,
  onExploreNearby,
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
          {!isLocalOnly ? (
            <>
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
            </>
          ) : null}
          {onExploreNearby ? (
            <PostFeedIconButton
              icon="safari"
              accessibilityLabel="Explore nearby"
              onPress={onExploreNearby}
            />
          ) : null}
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
      {localPost ? (
        <Row spacing={8} alignment="center">
          <Text
            testID={`${testIDPrefix}-detail-sync-status`}
            textStyle={{ color: localPost.status === 'failed' ? '#DC2626' : '#6B7280' }}
          >
            {SYNC_STATUS_LABELS[localPost.status] ?? localPost.status}
          </Text>
          {(localPost.status === 'local' || localPost.status === 'failed') && onUploadToCloud ? (
            <Button
              testID={`${testIDPrefix}-detail-upload-btn`}
              variant="outlined"
              label="Upload to Cloud"
              onPress={onUploadToCloud}
            />
          ) : null}
        </Row>
      ) : null}
    </Column>
  );

  return (
    <Host testID={`${testIDPrefix}-detail`} style={{ height: pageHeight }}>
      <ScrollView showsIndicators={false} style={{ height: pageHeight }}>
        <RNHostView matchContents>
          <View style={{ width, height: imageHeight }}>
            <ZoomableImage
              height={imageHeight}
              testID={`${testIDPrefix}-detail-image`}
              source={post.imageUrl ? { uri: post.imageUrl } : undefined}
              style={{ width, height: imageHeight }}
              width={width}
            />
            {isLocalOnly && localSyncStatus ? (
              <LocalPostSyncBadge
                testID={`${testIDPrefix}-detail-local-badge`}
                syncStatus={localSyncStatus}
              />
            ) : null}
          </View>
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
