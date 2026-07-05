import { observable } from '@legendapp/state';

export type MomentDraft = {
  occurredAt: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

export type AppliedMoment = {
  occurredAt: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  region: string;
  country: string;
};

export const momentPicker$ = observable<{
  draft: MomentDraft | null;
  applied: AppliedMoment | null;
}>({ draft: null, applied: null });

export function isValidMomentDraft(
  draft: MomentDraft | null,
): draft is MomentDraft {
  return (
    draft != null &&
    Number.isFinite(draft.latitude) &&
    Number.isFinite(draft.longitude)
  );
}
