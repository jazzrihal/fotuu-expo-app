import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

const SYMBOL_SIZE = 18;

type PostGridOverlayBadgeProps = {
  symbolName: string;
  accessibilityLabel: string;
  testID?: string;
};

export function PostGridOverlayBadge({
  symbolName,
  accessibilityLabel,
  testID,
}: PostGridOverlayBadgeProps) {
  return (
    <View testID={testID} style={styles.badge} pointerEvents="none">
      <SymbolView
        name={symbolName}
        tintColor="#FFFFFF"
        resizeMode="scaleAspectFit"
        style={styles.symbol}
        accessibilityLabel={accessibilityLabel}
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
  symbol: {
    width: SYMBOL_SIZE,
    height: SYMBOL_SIZE,
  },
});
