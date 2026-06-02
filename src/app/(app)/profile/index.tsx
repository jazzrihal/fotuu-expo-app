import { ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';
import { useAuth } from '@/context/auth';

export default function Profile() {
  const { session } = useAuth();

  return (
    <>
      <Stack.Screen options={{ title: 'Profile' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ padding: 24, gap: 12 }}>
          <Text style={{ fontSize: 20, fontWeight: '600' }}>Your account</Text>
          <Text testID="home-user-email" selectable style={{ fontSize: 15, color: '#6B7280' }}>
            {session?.user.email}
          </Text>
          <Text style={{ fontSize: 14, color: '#9CA3AF', marginTop: 8 }}>
            User ID:{' '}
            <Text selectable style={{ fontFamily: 'monospace' }}>
              {session?.user.id}
            </Text>
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
