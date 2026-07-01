import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RectButton } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { ProfileListItem } from '@/components/profile-list-item';

type SwipeableProfileListItemProps = {
  displayName: string;
  username: string;
  profileId: string;
  subtitle?: string;
  testID?: string;
  trailing?: ReactNode;
  actionLabel: string;
  onAction: () => void;
  actionDisabled?: boolean;
};

export function SwipeableProfileListItem({
  displayName,
  username,
  profileId,
  subtitle,
  testID,
  trailing,
  actionLabel,
  onAction,
  actionDisabled = false,
}: SwipeableProfileListItemProps) {
  function renderRightActions() {
    return (
      <RectButton
        style={styles.action}
        enabled={!actionDisabled}
        onPress={onAction}
      >
        <Text style={styles.actionLabel}>{actionLabel}</Text>
      </RectButton>
    );
  }

  return (
    <View>
      <Swipeable
        friction={2}
        overshootRight={false}
        renderRightActions={renderRightActions}
      >
        <ProfileListItem
          testID={testID}
          profileId={profileId}
          displayName={displayName}
          username={username}
          subtitle={subtitle}
          trailing={trailing}
        />
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  action: {
    alignItems: 'center',
    backgroundColor: '#DC2626',
    flex: 1,
    justifyContent: 'center',
    minWidth: 88,
    paddingHorizontal: 16,
  },
  actionLabel: {
    color: '#fff',
    fontWeight: '600',
  },
});
