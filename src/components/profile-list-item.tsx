import type { ReactNode } from 'react';
import { ListItem, RNHostView } from '@expo/ui';
import { ProfileLink } from '@/components/profile-link';
import { relationshipLabel, type RelationshipKind } from '@/lib/relationship-status';

type ProfileListItemProps = {
  displayName: string;
  username: string;
  profileId?: string;
  subtitle?: string;
  relationship?: RelationshipKind;
  onPress?: () => void;
  testID?: string;
  trailing?: ReactNode;
};

export function ProfileListItem({
  displayName,
  username,
  profileId,
  subtitle,
  relationship,
  onPress,
  testID,
  trailing,
}: ProfileListItemProps) {
  const statusLabel = relationship ? relationshipLabel(relationship) : '';
  const meta = subtitle ?? (trailing ? undefined : statusLabel || undefined);
  const supportingText = meta ? `@${username} · ${meta}` : `@${username}`;

  const title = profileId ? (
    <RNHostView matchContents>
      <ProfileLink
        userId={profileId}
        testID={testID ? `${testID}-name` : undefined}
      >
        {displayName}
      </ProfileLink>
    </RNHostView>
  ) : (
    displayName
  );

  return (
    <ListItem testID={testID} onPress={onPress} supportingText={supportingText}>
      {title}
      {trailing ? <ListItem.Trailing>{trailing}</ListItem.Trailing> : null}
    </ListItem>
  );
}
