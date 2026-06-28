export type PostLocationParts = {
  address?: string | null;
  city?: string | null;
  region?: string | null;
};

export function formatCapturedAt(value: string | Date): string {
  return new Date(value).toLocaleString();
}

export function buildLocationLine(parts: PostLocationParts): string {
  return [parts.address, parts.city, parts.region].filter(Boolean).join(', ');
}
