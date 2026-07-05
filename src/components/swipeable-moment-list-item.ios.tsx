import { Button, SwipeActions } from '@expo/ui/swift-ui';
import { disabled } from '@expo/ui/swift-ui/modifiers';
import { MomentListItemRow } from '@/components/moment-list-item';
import type {
  SwipeAction,
  SwipeableMomentListItemProps,
} from '@/components/swipeable-moment-list-item';

function resolveRole(
  action: SwipeAction,
  edge: 'leading' | 'trailing',
): 'destructive' | undefined {
  if (action.role === 'destructive') {
    return 'destructive';
  }
  if (action.role === 'default') {
    return undefined;
  }
  return edge === 'trailing' ? 'destructive' : undefined;
}

function renderActionButtons(
  actions: SwipeAction[],
  edge: 'leading' | 'trailing',
) {
  return actions.map((action) => (
    <Button
      key={action.label}
      role={resolveRole(action, edge)}
      label={action.label}
      modifiers={action.disabled ? [disabled(true)] : undefined}
      onPress={action.onPress}
    />
  ));
}

export function SwipeableMomentListItem({
  moment,
  onPress,
  testID,
  trailingActions,
}: SwipeableMomentListItemProps) {
  const row = (
    <MomentListItemRow moment={moment} onPress={onPress} testID={testID} />
  );

  if (!trailingActions?.length) {
    return row;
  }

  return (
    <SwipeActions>
      {row}
      <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
        {renderActionButtons(trailingActions, 'trailing')}
      </SwipeActions.Actions>
    </SwipeActions>
  );
}
