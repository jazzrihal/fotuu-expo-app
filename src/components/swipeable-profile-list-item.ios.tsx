import { Button, SwipeActions } from '@expo/ui/swift-ui';
import { disabled } from '@expo/ui/swift-ui/modifiers';
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
  return (
    <SwipeActions>
      <ProfileListItem
        testID={testID}
        profileId={profileId}
        displayName={displayName}
        username={username}
        subtitle={subtitle}
        trailing={trailing}
      />
      <SwipeActions.Actions edge="trailing" allowsFullSwipe={false}>
        <Button
          role="destructive"
          label={actionLabel}
          modifiers={actionDisabled ? [disabled(true)] : undefined}
          onPress={onAction}
        />
      </SwipeActions.Actions>
    </SwipeActions>
  );
}
