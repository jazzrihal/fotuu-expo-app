import type { ReactNode } from 'react';
import { Button } from '@expo/ui';
import { MomentListItemRow } from '@/components/moment-list-item';
import type { MomentListItem } from '@/lib/moments';

export type SwipeAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  role?: 'destructive' | 'default';
};

export type SwipeableMomentListItemProps = {
  moment: MomentListItem;
  onPress: () => void;
  testID?: string;
  trailing?: ReactNode;
  trailingActions?: SwipeAction[];
};

/** Default (e.g. web): visible trailing Delete button instead of native swipe. */
export function SwipeableMomentListItem({
  moment,
  onPress,
  testID,
  trailingActions,
}: SwipeableMomentListItemProps) {
  const deleteAction = trailingActions?.find(
    (action) => action.role === 'destructive',
  );

  return (
    <MomentListItemRow
      moment={moment}
      onPress={onPress}
      testID={testID}
      trailing={
        deleteAction ? (
          <Button
            testID={`moments-delete-${moment.id}`}
            variant="outlined"
            label={deleteAction.label}
            disabled={deleteAction.disabled}
            onPress={deleteAction.onPress}
          />
        ) : undefined
      }
    />
  );
}
