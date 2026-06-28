import type { ReactNode } from "react";
import { Platform } from "react-native";
import { BottomSheet, Column, Host } from "@expo/ui";
import { frame } from "@expo/ui/swift-ui/modifiers";

type EmptyActionsSheetProps = {
  isPresented: boolean;
  onDismiss: () => void;
  testID?: string;
  children: ReactNode;
};

const sheetColumnModifiers =
  Platform.OS === "ios"
    ? [frame({ maxWidth: Infinity, alignment: "center" })]
    : undefined;

export function EmptyActionsSheet({
  isPresented,
  onDismiss,
  testID,
  children,
}: EmptyActionsSheetProps) {
  if (!isPresented) {
    return null;
  }

  return (
    <Host>
      <BottomSheet
        isPresented
        onDismiss={onDismiss}
        testID={testID}
      >
        <Column
          spacing={12}
          alignment="center"
          modifiers={sheetColumnModifiers}
        >
          {children}
        </Column>
      </BottomSheet>
    </Host>
  );
}
