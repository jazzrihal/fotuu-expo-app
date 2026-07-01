import { StyleSheet, Text, View } from 'react-native';
import { Host } from '@expo/ui';
import { RectButton } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { ProfileListItem } from '@/components/profile-list-item';
import type { SwipeableProfileListItemProps } from '@/components/swipeable-profile-list-item';

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
    <View style={styles.wrapper}>
      <Swipeable
        friction={2}
        overshootRight={false}
        childrenContainerStyle={styles.childrenContainer}
        renderRightActions={renderRightActions}
      >
        <Host style={styles.rowHost}>
          <ProfileListItem
            testID={testID}
            profileId={profileId}
            displayName={displayName}
            username={username}
            subtitle={subtitle}
            trailing={trailing}
          />
        </Host>
      </Swipeable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  childrenContainer: {
    width: '100%',
  },
  rowHost: {
    width: '100%',
  },
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
