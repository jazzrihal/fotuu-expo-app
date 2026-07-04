import { StyleSheet, Text, View } from 'react-native';
import { Host } from '@expo/ui';
import { RectButton } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { ProfileListItem } from '@/components/profile-list-item';
import type {
  SwipeAction,
  SwipeableProfileListItemProps,
} from '@/components/swipeable-profile-list-item';

function resolveBackgroundColor(
  action: SwipeAction,
  edge: 'leading' | 'trailing',
): string {
  if (action.role === 'destructive') {
    return '#DC2626';
  }
  if (action.role === 'default') {
    return '#6B7280';
  }
  return edge === 'trailing' ? '#DC2626' : '#6B7280';
}

function renderActions(
  actions: SwipeAction[],
  edge: 'leading' | 'trailing',
) {
  return (
    <View style={styles.actionsRow}>
      {actions.map((action) => (
        <RectButton
          key={action.label}
          style={[
            styles.action,
            { backgroundColor: resolveBackgroundColor(action, edge) },
          ]}
          enabled={!action.disabled}
          onPress={action.onPress}
        >
          <Text style={styles.actionLabel}>{action.label}</Text>
        </RectButton>
      ))}
    </View>
  );
}

export function SwipeableProfileListItem({
  displayName,
  username,
  profileId,
  subtitle,
  testID,
  trailing,
  trailingActions,
  leadingActions,
}: SwipeableProfileListItemProps) {
  const row = (
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
  );

  if (!leadingActions?.length && !trailingActions?.length) {
    return <View style={styles.wrapper}>{row}</View>;
  }

  return (
    <View style={styles.wrapper}>
      <Swipeable
        friction={2}
        overshootLeft={false}
        overshootRight={false}
        childrenContainerStyle={styles.childrenContainer}
        renderLeftActions={
          leadingActions?.length
            ? () => renderActions(leadingActions, 'leading')
            : undefined
        }
        renderRightActions={
          trailingActions?.length
            ? () => renderActions(trailingActions, 'trailing')
            : undefined
        }
      >
        {row}
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
  actionsRow: {
    flexDirection: 'row',
  },
  action: {
    alignItems: 'center',
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
