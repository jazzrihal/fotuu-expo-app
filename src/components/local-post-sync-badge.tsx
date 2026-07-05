import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";
import type { LocalPostStatus } from "@/lib/post-db";

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
    <View testID={testID} style={styles.badge} pointerEvents="none">
      <SymbolView
        name={uploading ? "icloud.and.arrow.up" : "icloud.slash"}
        size={18}
        tintColor="#FFFFFF"
        accessibilityLabel={uploading ? "Uploading" : "Not uploaded"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 12,
    padding: 4,
  },
});
