import type { ReactNode } from 'react';
import { ProfileListItem } from '@/components/profile-list-item';

export type SwipeableProfileListItemProps = {
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

/** Default (e.g. web): swipe actions are native-only; render a plain list row. */
export function SwipeableProfileListItem({
  displayName,
  username,
  profileId,
  subtitle,
  testID,
  trailing,
}: SwipeableProfileListItemProps) {
  return (
    <ProfileListItem
      testID={testID}
      profileId={profileId}
      displayName={displayName}
      username={username}
      subtitle={subtitle}
      trailing={trailing}
    />
  );
}
