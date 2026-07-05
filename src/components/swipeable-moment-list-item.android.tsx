import { StyleSheet, Text, View } from 'react-native';
import { Host } from '@expo/ui';
import { RectButton } from 'react-native-gesture-handler';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { MomentListItemRow } from '@/components/moment-list-item';
import type {
  SwipeAction,
  SwipeableMomentListItemProps,
} from '@/components/swipeable-moment-list-item';

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

export function SwipeableMomentListItem({
  moment,
  onPress,
  testID,
  trailingActions,
}: SwipeableMomentListItemProps) {
  const row = (
    <Host style={styles.rowHost}>
      <MomentListItemRow moment={moment} onPress={onPress} testID={testID} />
    </Host>
  );

  if (!trailingActions?.length) {
    return <View style={styles.wrapper}>{row}</View>;
  }

  return (
    <View style={styles.wrapper}>
      <Swipeable
        friction={2}
        overshootLeft={false}
        overshootRight={false}
        childrenContainerStyle={styles.childrenContainer}
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
