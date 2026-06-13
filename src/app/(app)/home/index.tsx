import { Column, Host, ScrollView, Text } from '@expo/ui';
import { Stack } from 'expo-router';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <Host style={{ flex: 1 }}>
        <ScrollView>
          <Column spacing={12} style={{ padding: 24 }}>
            <Text>Welcome to Fotuu</Text>
            <Text>Find friends and manage your profile from the tabs below.</Text>
          </Column>
        </ScrollView>
      </Host>
    </>
  );
}
