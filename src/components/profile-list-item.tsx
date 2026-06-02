import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

type ProfileListItemProps = {
  displayName: string;
  username: string;
  subtitle?: string;
  onPress?: () => void;
  testID?: string;
  trailing?: ReactNode;
};

export function ProfileListItem({
  displayName,
  username,
  subtitle,
  onPress,
  testID,
  trailing,
}: ProfileListItemProps) {
  const meta = subtitle;

  const content = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 16,
      }}
    >
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 16, fontWeight: '600' }}>{displayName}</Text>
        <Text style={{ fontSize: 14, color: '#6B7280' }}>@{username}</Text>
        {meta ? (
          <Text style={{ fontSize: 13, color: '#9CA3AF', marginTop: 2 }}>{meta}</Text>
        ) : null}
      </View>
      {trailing}
    </View>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={{ borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? '#F9FAFB' : '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
      })}
    >
      {content}
    </Pressable>
  );
}
