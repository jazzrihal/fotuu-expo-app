import { requireOptionalNativeModule } from 'expo';
import type { SearchSuggestion, ResolvedLocation, SearchRegion } from './LocationSearch.types';

const LocationSearchNativeModule = requireOptionalNativeModule('LocationSearch');

/**
 * Returns autocomplete suggestions for the given query string.
 * Results are biased toward `region` when provided.
 */
export async function getCompletions(
  query: string,
  region?: SearchRegion,
): Promise<SearchSuggestion[]> {
  if (!LocationSearchNativeModule) return [];
  return LocationSearchNativeModule.getCompletions(
    query,
    region?.latitude ?? null,
    region?.longitude ?? null,
  );
}

/**
 * Resolves a search suggestion to precise coordinates.
 * Results are biased toward `region` when provided.
 */
export async function resolveCompletion(
  suggestion: SearchSuggestion,
  region?: SearchRegion,
): Promise<ResolvedLocation> {
  if (!LocationSearchNativeModule) {
    throw new Error('LocationSearch native module is not available. Rebuild the app.');
  }
  return LocationSearchNativeModule.resolveCompletion(
    suggestion.title,
    suggestion.subtitle,
    region?.latitude ?? null,
    region?.longitude ?? null,
  );
}

export type { SearchSuggestion, ResolvedLocation, SearchRegion };
