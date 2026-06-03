export type RelationshipKind =
  | 'self'
  | 'friends'
  | 'incoming_request'
  | 'outgoing_request'
  | 'none'
  | 'unknown';

export function parseRelationshipStatus(status: string | null | undefined): RelationshipKind {
  const normalized = (status ?? '').trim().toLowerCase();
  if (!normalized) return 'none';

  if (normalized === 'self' || normalized === 'me') return 'self';
  if (
    normalized === 'friends' ||
    normalized === 'friend' ||
    normalized === 'accepted'
  ) {
    return 'friends';
  }
  if (
    normalized === 'pending_incoming' ||
    normalized === 'incoming' ||
    normalized === 'incoming_request' ||
    normalized === 'request_received' ||
    normalized === 'received'
  ) {
    return 'incoming_request';
  }
  if (
    normalized === 'pending_outgoing' ||
    normalized === 'outgoing' ||
    normalized === 'outgoing_request' ||
    normalized === 'request_sent' ||
    normalized === 'sent'
  ) {
    return 'outgoing_request';
  }
  if (normalized === 'none' || normalized === 'stranger') return 'none';

  return 'unknown';
}

export function relationshipLabel(kind: RelationshipKind): string {
  switch (kind) {
    case 'self':
      return 'You';
    case 'friends':
      return 'Friends';
    case 'incoming_request':
      return 'Request received';
    case 'outgoing_request':
      return 'Request sent';
    case 'none':
      return '';
    case 'unknown':
      return '';
  }
}
