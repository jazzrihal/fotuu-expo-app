import type { UserProfile } from '@/lib/profile';

function emailPrefix(email: string | undefined): string {
  if (!email) {
    return '';
  }

  return email.split('@')[0] ?? '';
}

export function profileDisplayName(
  profile: Pick<UserProfile, 'display_name'> | null | undefined,
  email: string | undefined,
): string {
  if (profile?.display_name) {
    return profile.display_name;
  }

  return emailPrefix(email);
}

