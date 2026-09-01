'use client';

import React from 'react';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from '@repo/ui/components/customs/autocomplete';
import { RiMapPin2Line } from '@remixicon/react';
import type { LocationSuggestion } from '@repo/db/query/application';
import { fetchLocationSuggestionsAction } from '@/actions/application/fetch-locations';
import { countryName } from '@/components/features/job-matches/constants';

export interface LocationValue {
  city: string;
  /** ISO 3166-1 alpha-2, or empty. */
  country: string;
}

interface SelectLocationProps {
  value: LocationValue;
  onChange: (next: LocationValue) => void;
  placeholder?: string;
  inputClassName?: string;
}

const DEBOUNCE_MS = 300;

/** "Paris, France", "France", or "Paris" — whichever halves exist. */
export const formatLocation = ({ city, country }: LocationValue): string =>
  [city, country ? countryName(country) : ''].filter(Boolean).join(', ');

/**
 * Where a job is, picked from what other postings already say.
 *
 * The suggestions come from the offers we have scraped and from the user's own
 * applications, so a place is spelled the way the boards spell it and sorting by
 * city groups what belongs together. Typing something we have never seen is
 * still allowed — it lands as a city with no country, which is what somebody
 * typing "Remote — EMEA" means anyway.
 */
export default function SelectLocation({
  value,
  onChange,
  placeholder = 'City, country',
  inputClassName,
}: SelectLocationProps) {
  const [results, setResults] = React.useState<LocationSuggestion[]>([]);
  const [focused, setFocused] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [draft, setDraft] = React.useState(() => formatLocation(value));

  // The parent owns the value, so an edit loaded after mount has to reach the
  // box; the user's own typing is what `draft` protects in the meantime.
  React.useEffect(() => {
    if (!focused) setDraft(formatLocation(value));
  }, [value, focused]);

  const debounced = useDebounce(draft, DEBOUNCE_MS);

  React.useEffect(() => {
    if (!focused) return;
    let cancelled = false;
    void (async () => {
      const places = await fetchLocationSuggestionsAction(
        debounced.trim() || undefined,
      );
      if (!cancelled) setResults(places);
    })();
    return () => {
      cancelled = true;
    };
  }, [focused, debounced]);

  const pick = (place: LocationSuggestion) => {
    onChange({ city: place.city, country: place.country });
    setDraft(formatLocation(place));
    setOpen(false);
  };

  return (
    <Autocomplete
      value={draft}
      onValueChange={setDraft}
      open={open}
      onOpenChange={setOpen}
      items={results}
      itemToStringValue={(place: LocationSuggestion) =>
        place ? formatLocation(place) : ''
      }
    >
      <AutocompleteInput
        placeholder={placeholder}
        className={inputClassName}
        showClear
        onChange={(event) => setDraft(event.target.value)}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
        }}
        onBlur={() => {
          setFocused(false);
          // Whatever is in the box wins on the way out: an unmatched place is a
          // city we have simply never seen, not an error to discard.
          const typed = draft.trim();
          if (!typed) {
            onChange({ city: '', country: '' });
            return;
          }
          if (typed !== formatLocation(value)) {
            const match = results.find(
              (place) =>
                formatLocation(place).toLowerCase() === typed.toLowerCase(),
            );
            onChange(
              match
                ? { city: match.city, country: match.country }
                : { city: typed.slice(0, 120), country: '' },
            );
          }
        }}
      />
      <AutocompleteContent>
        <AutocompleteEmpty>
          No match — press Tab to keep what you typed.
        </AutocompleteEmpty>
        <AutocompleteList>
          {(place: LocationSuggestion) => (
            <AutocompleteItem
              key={`${place.city}|${place.country}`}
              value={place}
              onClick={() => pick(place)}
            >
              <RiMapPin2Line className="size-4 shrink-0 text-muted-foreground" />
              <span>{formatLocation(place)}</span>
            </AutocompleteItem>
          )}
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  );
}
