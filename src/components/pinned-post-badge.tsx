import type { StyleProp, ViewStyle } from "react-native";
import { PostGridOverlayBadge } from "@/components/post-grid-overlay-badge";

type PinnedPostBadgeProps = {
  style?: StyleProp<ViewStyle>;
};

export function PinnedPostBadge({ style }: PinnedPostBadgeProps) {
  return (
    <PostGridOverlayBadge
      testID="pinned-post-thumbnail"
      symbolName="pin"
      accessibilityLabel="Pinned"
      style={style}
    />
  );
}
