import { PostGridOverlayBadge } from "@/components/post-grid-overlay-badge";

export function PinnedPostBadge() {
  return (
    <PostGridOverlayBadge
      testID="pinned-post-thumbnail"
      symbolName="pin"
      accessibilityLabel="Pinned"
    />
  );
}
