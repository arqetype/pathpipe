'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchCompanies } from '@/actions/application/fetch-companies';
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

  const search = useCallback(async (query: string) => {
    setLoading(true);

    try {
      const companies = await fetchCompanies(query);
      setResults(companies);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
      setResults([]);
    } finally {
      setLoading(false);
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
