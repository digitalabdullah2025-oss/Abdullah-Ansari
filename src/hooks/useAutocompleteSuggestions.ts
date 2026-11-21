import { useCallback, useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

export interface UseAutocompleteSuggestionsReturn {
  suggestions: google.maps.places.AutocompleteSuggestion[];
  isLoading: boolean;
  error: string | null;
  resetSession: () => void;
}

export function isMapsQuotaError(err: unknown): boolean {
  const text = err instanceof Error ? err.message : String(err);
  return (
    text.includes('RESOURCE_EXHAUSTED') ||
    text.includes('OVER_QUERY_LIMIT') ||
    text.includes('QuotaExceededError') ||
    text.includes('OverQuotaMapError') ||
    text.includes('429')
  );
}

export function useAutocompleteSuggestions(
  inputString: string,
  requestOptions: Partial<google.maps.places.AutocompleteRequest> = {}
): UseAutocompleteSuggestionsReturn {
  const placesLib = useMapsLibrary('places');
  const sessionTokenRef =
    useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const [suggestions, setSuggestions] = useState<
    google.maps.places.AutocompleteSuggestion[]
  >([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!placesLib) return;
    const trimmed = inputString.trim();
    if (!trimmed) {
      setSuggestions([]);
      setIsLoading(false);
      return;
    }

    const { AutocompleteSessionToken, AutocompleteSuggestion } = placesLib;
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = new AutocompleteSessionToken();
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      setIsLoading(true);
      setError(null);

      const request: google.maps.places.AutocompleteRequest = {
        includedRegionCodes: ['in'],
        ...requestOptions,
        input: trimmed,
        sessionToken: sessionTokenRef.current ?? undefined,
      };

      AutocompleteSuggestion.fetchAutocompleteSuggestions(request)
        .then((res) => {
          if (!cancelled) {
            setSuggestions(res.suggestions ?? []);
          }
        })
        .catch((err: unknown) => {
          if (isMapsQuotaError(err)) {
            window.dispatchEvent(new CustomEvent('gmp-quota-exceeded'));
          }
          if (!cancelled) {
            setError('Unable to fetch address suggestions right now.');
            setSuggestions([]);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLoading(false);
          }
        });
    }, 260);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [placesLib, inputString]);

  const resetSession = useCallback(() => {
    sessionTokenRef.current = null;
    setSuggestions([]);
  }, []);

  return { suggestions, isLoading, error, resetSession };
}
