import type { LocalPostStatus } from "@/lib/post-db";
import { PostGridOverlayBadge } from "@/components/post-grid-overlay-badge";

type LocalPostSyncBadgeProps = {
  syncStatus: LocalPostStatus;
  testID?: string;
};

export function LocalPostSyncBadge({
  syncStatus,
  testID,
}: LocalPostSyncBadgeProps) {
  const uploading = syncStatus === "uploading";

  return (
    <PostGridOverlayBadge
      testID={testID}
      symbolName={uploading ? "icloud.and.arrow.up" : "icloud.slash"}
      accessibilityLabel={uploading ? "Uploading" : "Not uploaded"}
    />
  );
}
