import { ScrollView, Text, View } from 'react-native';
import { Stack } from 'expo-router';

export default function Home() {
  return (
    <>
      <Stack.Screen options={{ title: 'Home' }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <View style={{ padding: 24, gap: 12 }}>
          <Text style={{ fontSize: 28, fontWeight: '700', letterSpacing: -0.5 }}>
            Welcome to Fotuu
          </Text>
          <Text style={{ fontSize: 16, color: '#6B7280' }}>
            Find friends and manage your profile from the tabs below.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
