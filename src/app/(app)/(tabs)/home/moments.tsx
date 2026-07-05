import { useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Column, FieldGroup, Host, ListItem, Text } from "@expo/ui";
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
  const saveDisabled =
    !draftValid || createMutation.isPending || !session?.user.id;
  const busyDeleteId = deleteMutation.isPending
    ? (deleteMutation.variables ?? null)
    : null;

  function handleSave() {
    const currentDraft = momentPicker$.draft.get();
    if (
      !isValidMomentDraft(currentDraft) ||
      !session?.user.id ||
      createMutation.isPending
    ) {
      return;
    }

    setActionError(null);
    createMutation.mutate(
      {
        occurredAt: currentDraft.occurredAt,
        latitude: currentDraft.latitude,
        longitude: currentDraft.longitude,
        address: currentDraft.address,
        city: currentDraft.city,
        region: currentDraft.region,
        country: currentDraft.country,
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

  const savedSection = (() => {
    if (momentsQuery.isPending || momentsQuery.error || moments.length === 0) {
      return null;
    }
    return (
      <FieldGroup.Section testID="moments-list-section" title="Saved">
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
                disabled: busyDeleteId !== null && busyDeleteId !== moment.id,
                onPress: () => handleDelete(moment.id),
              },
            ]}
          />
        ))}
      </FieldGroup.Section>
    );
  })();

  return (
    <>
      <View style={styles.screen}>
        <View style={styles.hostWrapper}>
          <Host style={styles.host} useViewportSizeMeasurement>
            <FieldGroup>
              <FieldGroup.Section
                testID="moments-draft-summary"
                title="Current moment"
              >
                {draftValid ? (
                  <ListItem supportingText={formatMomentLocation(draft)}>
                    {formatMomentOccurredAt(draft.occurredAt)}
                  </ListItem>
                ) : (
                  <ListItem>Set a location on Home to save a moment</ListItem>
                )}
              </FieldGroup.Section>
              {savedSection}
            </FieldGroup>
          </Host>
        </View>
        {momentsQuery.isPending && (
          <ActivityIndicator style={styles.loader} />
        )}
        {momentsQuery.error && (
          <Column style={styles.message}>
            <Text testID="moments-load-error">{momentsQuery.error.message}</Text>
          </Column>
        )}
        {!momentsQuery.isPending && !momentsQuery.error && moments.length === 0 && (
          <Empty
            testID="moments-empty"
            title="No saved moments"
            description="Save a date and location from Home to recall them later."
          />
        )}
        {actionError ? (
          <Column style={styles.message}>
            <Text testID="moments-action-error">{actionError}</Text>
          </Column>
        ) : null}
      </View>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel={createMutation.isPending ? "Saving" : "Save"}
          variant="done"
          disabled={saveDisabled}
          onPress={handleSave}
        >
          {createMutation.isPending ? "Saving…" : "Save"}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  hostWrapper: {
    flex: 1,
  },
  host: {
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
