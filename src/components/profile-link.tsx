import type { ReactNode } from 'react';
import { Pressable, Text, type TextStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';

type ProfileLinkProps = {
  userId: string;
  children: ReactNode;
  testID?: string;
  textStyle?: TextStyle;
};

export function ProfileLink({
  userId,
  children,
  testID,
  textStyle,
}: ProfileLinkProps) {
  const router = useRouter();
  const { session } = useAuth();

  function handlePress() {
    if (userId === session?.user.id) {
      router.push('/(app)/(tabs)/profile');
      return;
    }

    router.push({
      pathname: '/(app)/user/[id]',
      params: { id: userId },
    });
  }

  return (
    <Pressable
      accessibilityRole="link"
      testID={testID}
      onPress={handlePress}
    >
      <Text style={[{ fontWeight: '600' }, textStyle]}>{children}</Text>
    </Pressable>
  );
}
