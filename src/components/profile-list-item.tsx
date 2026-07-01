import type { ReactNode } from 'react';
import { useCallback } from 'react';
import { ListItem, Text } from '@expo/ui';
import { useRouter } from 'expo-router';
import { useAuth } from '@/context/auth';
import { openUserProfile } from '@/lib/navigation';
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
  const router = useRouter();
  const { session } = useAuth();

  const statusLabel = relationship ? relationshipLabel(relationship) : '';
  const meta = subtitle ?? (trailing ? undefined : statusLabel || undefined);
  const supportingText = meta ? `@${username} · ${meta}` : `@${username}`;

  const openProfile = useCallback(() => {
    if (!profileId) {
      return;
    }

    openUserProfile(router, session?.user.id, {
      id: profileId,
      displayName,
      username,
    });
  }, [profileId, router, session?.user.id, displayName, username]);

  const title = profileId ? (
    <Text
      textStyle={{ fontWeight: '600' }}
      testID={testID ? `${testID}-name` : undefined}
      onPress={openProfile}
    >
      {displayName}
    </Text>
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
