import type { ReactNode } from 'react';
import { ListItem } from '@expo/ui';
import { relationshipLabel, type RelationshipKind } from '@/lib/relationship-status';

type ProfileListItemProps = {
  displayName: string;
  username: string;
  subtitle?: string;
  relationship?: RelationshipKind;
  onPress?: () => void;
  testID?: string;
  trailing?: ReactNode;
};

export function ProfileListItem({
  displayName,
  username,
  subtitle,
  relationship,
  onPress,
  testID,
  trailing,
}: ProfileListItemProps) {
  const statusLabel = relationship ? relationshipLabel(relationship) : '';
  const meta = subtitle ?? (trailing ? undefined : statusLabel || undefined);
  const supportingText = meta ? `@${username} · ${meta}` : `@${username}`;

  return (
    <ListItem testID={testID} onPress={onPress} supportingText={supportingText}>
      {displayName}
      {trailing ? <ListItem.Trailing>{trailing}</ListItem.Trailing> : null}
    </ListItem>
  );
}
