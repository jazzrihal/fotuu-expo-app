import { useColorScheme } from "react-native";
import { Column, Host, Spacer, Text } from "@expo/ui";

const SECONDARY_COLORS = {
  light: "#6C6C70",
  dark: "#8E8E93",
} as const;

type EmptyProps = {
  title: string;
  description?: string;
  testID?: string;
};

export function Empty({ title, description, testID }: EmptyProps) {
  const colorScheme = useColorScheme();
  const secondaryColor =
    SECONDARY_COLORS[colorScheme === "dark" ? "dark" : "light"];

  return (
    <Host style={{ flex: 1 }} testID={testID}>
      <Column alignment="center" spacing={8} style={{ paddingHorizontal: 24 }}>
        <Spacer flexible />
        <Text textStyle={{ fontWeight: "600", textAlign: "center" }}>
          {title}
        </Text>
        {description ? (
          <Text textStyle={{ textAlign: "center", color: secondaryColor }}>
            {description}
          </Text>
        ) : null}
        <Spacer flexible />
      </Column>
    </Host>
  );
}
