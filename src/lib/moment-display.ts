import type { MomentListItem } from '@/lib/moments';

export function formatMomentOccurredAt(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function formatMomentLocation(parts: {
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
}): string {
  const line = [parts.address, parts.city, parts.region, parts.country]
    .filter((value) => value?.trim())
    .join(', ');

  return line || 'Selected location';
}

export function momentListSubtitle(item: MomentListItem): string {
  return formatMomentLocation(item);
}
