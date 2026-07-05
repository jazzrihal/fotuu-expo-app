import type { ReactNode } from 'react';
import { ListItem } from '@expo/ui';
import {
  formatMomentOccurredAt,
  momentListSubtitle,
} from '@/lib/moment-display';
import type { MomentListItem } from '@/lib/moments';

type MomentListItemProps = {
  moment: MomentListItem;
  onPress: () => void;
  testID?: string;
  trailing?: ReactNode;
};

export function MomentListItemRow({
  moment,
  onPress,
  testID,
  trailing,
}: MomentListItemProps) {
  return (
    <ListItem
      testID={testID}
      onPress={onPress}
      supportingText={momentListSubtitle(moment)}
    >
      {formatMomentOccurredAt(moment.occurred_at)}
      {trailing ? <ListItem.Trailing>{trailing}</ListItem.Trailing> : null}
    </ListItem>
  );
}
