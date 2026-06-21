import { StyleSheet, View } from "react-native";
import DateTimePicker from "@expo/ui/community/datetime-picker";
import { Host, Button } from "@expo/ui";

type HomeFeedHeaderProps = {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  locationLabel: string;
  onLocationPress: () => void;
};

export function HomeFeedHeader({
  selectedDate,
  onDateChange,
  locationLabel,
  onLocationPress,
}: HomeFeedHeaderProps) {
  return (
    <View style={styles.headerRow}>
      <Host matchContents>
        <Button
          testID="home-feed-location"
          variant="outlined"
          label={locationLabel}
          onPress={onLocationPress}
        />
      </Host>
      <View style={styles.spacer} />
      <DateTimePicker
        value={selectedDate}
        mode="datetime"
        display="compact"
        style={styles.datePicker}
        onValueChange={(_, date) => {
          onDateChange(date);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    minHeight: 56,
  },
  spacer: {
    flex: 1,
  },
  datePicker: {
    width: 210,
  },
});
