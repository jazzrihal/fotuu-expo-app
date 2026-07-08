import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { MAX_FRIENDS } from "@/lib/friends";

const SECONDARY_COLORS = {
  light: "#6C6C70",
  dark: "#8E8E93",
} as const;

const TRACK_COLORS = {
  light: "#E5E5EA",
  dark: "#3A3A3C",
} as const;

const FILL_COLORS = {
  light: "#007AFF",
  dark: "#0A84FF",
} as const;

const SECTION_BACKGROUNDS = {
  light: "#FFFFFF",
  dark: "#1C1C1E",
} as const;

const SEPARATOR_COLORS = {
  light: "#C6C6C8",
  dark: "#38383A",
} as const;

type FriendsCountBarProps = {
  count: number;
};

export function FriendsCountBar({ count }: FriendsCountBarProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";
  const clampedCount = Math.min(Math.max(count, 0), MAX_FRIENDS);
  const progress = clampedCount / MAX_FRIENDS;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: SECTION_BACKGROUNDS[theme],
          borderBottomColor: SEPARATOR_COLORS[theme],
        },
      ]}
      testID="friends-count-bar"
    >
      <Text
        testID="friends-count-label"
        style={[styles.label, { color: SECONDARY_COLORS[theme] }]}
      >
        {`${clampedCount} of ${MAX_FRIENDS} friends`}
      </Text>
      <View
        accessibilityLabel={`${clampedCount} of ${MAX_FRIENDS} friends`}
        accessibilityRole="progressbar"
        accessibilityValue={{
          min: 0,
          max: MAX_FRIENDS,
          now: clampedCount,
        }}
        style={[styles.track, { backgroundColor: TRACK_COLORS[theme] }]}
      >
        <View
          style={[
            styles.fill,
            {
              backgroundColor: FILL_COLORS[theme],
              width: `${progress * 100}%`,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: {
    fontSize: 15,
    fontWeight: "600",
  },
  track: {
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: 3,
  },
});
