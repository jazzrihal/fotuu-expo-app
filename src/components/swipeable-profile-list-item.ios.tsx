import { Button, SwipeActions } from '@expo/ui/swift-ui';
import { disabled } from '@expo/ui/swift-ui/modifiers';
import { ProfileListItem } from '@/components/profile-list-item';
import type {
  SwipeAction,
  SwipeableProfileListItemProps,
} from '@/components/swipeable-profile-list-item';

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
    <ProfileListItem
      testID={testID}
      profileId={profileId}
      displayName={displayName}
      username={username}
      subtitle={subtitle}
      trailing={trailing}
    />
  );

  if (!leadingActions?.length && !trailingActions?.length) {
    return row;
  }

  return (
    <SwipeActions>
      {row}
      {leadingActions?.length ? (
        <SwipeActions.Actions edge="leading" allowsFullSwipe={false}>
          {renderActionButtons(leadingActions, 'leading')}
        </SwipeActions.Actions>
      ) : null}
      {trailingActions?.length ? (
        <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
          {renderActionButtons(trailingActions, 'trailing')}
        </SwipeActions.Actions>
      ) : null}
    </SwipeActions>
  );
}
