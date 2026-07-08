import { useRouter } from "expo-router";
import { Stack } from "expo-router";
import { Host, Button, Icon } from "@expo/ui";
import { FriendsFeedTab } from "@/components/friends/friends-feed-tab";

export default function FriendsScreen() {
  const router = useRouter();

  return (
    <>
      <Stack.Screen
        options={{
          title: "Friends",
          headerRight: () => (
            <Host matchContents>
              <Button
                variant="text"
                testID="friends-list-button"
                onPress={() => router.push("/friends/list")}
              >
                <Icon name="person.2" size={22} accessibilityLabel="Friends list" />
              </Button>
            </Host>
          ),
        }}
      />
      <FriendsFeedTab />
    </>
  );
}
