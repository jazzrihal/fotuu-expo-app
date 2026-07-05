import { formatDistanceToNow } from 'date-fns';

export type PostLocationParts = {
  address?: string | null;
  city?: string | null;
  region?: string | null;
  country?: string | null;
};

export function formatCapturedAt(value: string | Date): string {
  return new Date(value).toLocaleString();
}

export function formatCapturedAtAgo(value: string | Date): string {
  return formatDistanceToNow(new Date(value), { addSuffix: true });
}

export function buildLocationLine(parts: PostLocationParts): string {
  return [parts.address, parts.city, parts.region, parts.country]
    .filter(Boolean)
    .join(', ');
}
