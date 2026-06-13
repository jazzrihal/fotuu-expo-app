import { Column, Host, ScrollView, Text } from '@expo/ui';
import { Stack } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function Profile() {
  const { session, signOut } = useAuth();

  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <Host style={{ flex: 1 }}>
        <ScrollView>
          <Column spacing={12} style={{ padding: 24 }}>
            <Text>Your account</Text>
            <Text testID="home-user-email">{session?.user.email ?? ''}</Text>
            <Text>{`User ID: ${session?.user.id ?? ''}`}</Text>
          </Column>
        </ScrollView>
      </Host>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button accessibilityLabel="Sign out" onPress={signOut}>
          Sign out
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}
