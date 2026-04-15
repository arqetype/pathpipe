'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from '@repo/ui/components/autocomplete';
import { CompanyLogo } from './company-logo';

type CompanyOption = { id: string; name: string };

type SelectCompanyProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const DEBOUNCE_MS = 300;

export default function SelectCompany({
  value,
  onChange,
  placeholder = 'Acme Corp',
}: SelectCompanyProps) {
  const [results, setResults] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const requestIdRef = useRef(0);

  const search = useCallback(async (query: string) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!baseUrl) return;

    const requestId = ++requestIdRef.current;
    setLoading(true);

    try {
      const url = new URL('/companies', baseUrl);
      if (query.trim()) url.searchParams.set('query', query.trim());
      url.searchParams.set('limit', '10');

      const response = await fetch(url.toString(), { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch companies');

      const data = (await response.json()) as CompanyOption[];
      if (requestIdRef.current === requestId) {
        setResults(data.slice(0, 10));
        setLoading(false);
      }
    } catch {
      if (requestIdRef.current === requestId) {
        setResults([]);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!focused || !value.trim()) return;
    const timeout = setTimeout(() => search(value), DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [value, focused, search]);

  return (
    <Autocomplete
      value={value}
      onValueChange={onChange}
      open={open}
      onOpenChange={setOpen}
      items={results}
      itemToStringValue={(company: CompanyOption) => company.name}
      autoHighlight
    >
      <AutocompleteInput
        placeholder={placeholder}
        loading={loading}
        onFocus={() => {
          setFocused(true);
          setOpen(true);
          search(value);
        }}
        onBlur={() => setFocused(false)}
      />
      <AutocompleteContent>
        <AutocompleteEmpty>No companies found.</AutocompleteEmpty>
        <AutocompleteList>
          {(item: CompanyOption) => (
            <AutocompleteItem key={item.id} value={item}>
              <CompanyLogo
                name={item.name}
                size={14}
                className="size-4 shrink-0 rounded-xs"
              />
              <span>{item.name}</span>
            </AutocompleteItem>
          )}
        </AutocompleteList>
      </AutocompleteContent>
    </Autocomplete>
  );
}
