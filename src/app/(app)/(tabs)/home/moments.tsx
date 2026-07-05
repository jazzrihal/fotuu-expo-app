import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Column, FieldGroup, Host, Text } from "@expo/ui";
import { Stack, useRouter } from "expo-router";
import { Empty } from "@/components/empty";
import { SwipeableMomentListItem } from "@/components/swipeable-moment-list-item";
import { useAuth } from "@/context/auth";
import {
  formatMomentLocation,
  formatMomentOccurredAt,
} from "@/lib/moment-display";
import {
  isValidMomentDraft,
  momentPicker$,
} from "@/lib/moment-picker-store";
import type { MomentListItem } from "@/lib/moments";
import {
  useCreateMomentMutation,
  useDeleteMomentMutation,
  useMomentsQuery,
} from "@/queries/moments";

export default function MomentsScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const draft = momentPicker$.draft.get();

  const momentsQuery = useMomentsQuery();
  const createMutation = useCreateMomentMutation();
  const deleteMutation = useDeleteMomentMutation();

  const [actionError, setActionError] = useState<string | null>(null);

  const moments = momentsQuery.data ?? [];
  const draftValid = isValidMomentDraft(draft);
  const busyDeleteId = deleteMutation.isPending
    ? (deleteMutation.variables ?? null)
    : null;

  function handleSave() {
    if (!draftValid || !session?.user.id || createMutation.isPending) {
      return;
    }

    setActionError(null);
    createMutation.mutate(
      {
        occurredAt: draft.occurredAt,
        latitude: draft.latitude,
        longitude: draft.longitude,
        address: draft.address,
        city: draft.city,
        region: draft.region,
        country: draft.country,
        userId: session.user.id,
      },
      {
        onError: (error) => setActionError(error.message),
        onSuccess: () => setActionError(null),
      },
    );
  }

  function applyMomentRow(moment: MomentListItem) {
    momentPicker$.applied.set({
      occurredAt: moment.occurred_at,
      latitude: moment.latitude,
      longitude: moment.longitude,
      address: moment.address,
      city: moment.city,
      region: moment.region,
      country: moment.country,
    });
    router.back();
  }

  function handleDelete(momentId: string) {
    setActionError(null);
    deleteMutation.mutate(momentId, {
      onError: (error) => setActionError(error.message),
      onSuccess: () => setActionError(null),
    });
  }

  const listContent = (() => {
    if (momentsQuery.isPending) {
      return <ActivityIndicator style={styles.loader} />;
    }

    if (momentsQuery.error) {
      return (
        <Host style={styles.message}>
          <Text>{momentsQuery.error.message}</Text>
        </Host>
      );
    }

    if (moments.length === 0) {
      return (
        <Empty
          testID="moments-empty"
          title="No saved moments"
          description="Save a date and location from Home to recall them later."
        />
      );
    }

    return (
      <FieldGroup>
        <FieldGroup.Section testID="moments-list-section">
          {moments.map((moment) => (
            <SwipeableMomentListItem
              key={moment.id}
              testID={`moments-list-item-${moment.id}`}
              moment={moment}
              onPress={() => applyMomentRow(moment)}
              trailingActions={[
                {
                  label: "Delete",
                  role: "destructive",
                  disabled:
                    busyDeleteId !== null && busyDeleteId !== moment.id,
                  onPress: () => handleDelete(moment.id),
                },
              ]}
            />
          ))}
        </FieldGroup.Section>
      </FieldGroup>
    );
  })();

  return (
    <View style={styles.screen}>
      <View style={styles.summary} testID="moments-draft-summary">
        {draftValid ? (
          <Column spacing={4}>
            <Text>{formatMomentOccurredAt(draft.occurredAt)}</Text>
            <Text>{formatMomentLocation(draft)}</Text>
          </Column>
        ) : (
          <Text>Set a location on Home to save a moment</Text>
        )}
        {actionError ? (
          <Text testID="moments-action-error">{actionError}</Text>
        ) : null}
      </View>

      <View style={styles.list}>{listContent}</View>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Save"
          variant="done"
          disabled={
            !draftValid || createMutation.isPending || !session?.user.id
          }
          onPress={handleSave}
        >
          Save
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  summary: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    gap: 8,
  },
  list: {
    flex: 1,
  },
  loader: {
    marginTop: 32,
  },
  message: {
    paddingHorizontal: 16,
    paddingTop: 24,
  },
});
