'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
import { fetchCompanies } from '@/actions/application/fetch-companies';
import { CompanyLogo } from './company-logo';
import {
  Autocomplete,
  AutocompleteContent,
  AutocompleteEmpty,
  AutocompleteInput,
  AutocompleteItem,
  AutocompleteList,
} from '@repo/ui/components/customs/autocomplete';

type CompanyOption = { id: string; name: string; logoUrl?: string };

type SelectCompanyProps = {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
};

const DEBOUNCE_MS = 300;

export default function SelectCompany({
  value,
  onValueChange,
  placeholder = 'Select a company',
}: SelectCompanyProps) {
  const [results, setResults] = useState<CompanyOption[]>([]);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_MS);

  useEffect(() => {
    if (!focused) return;
    (async () => {
      try {
        const companies = await fetchCompanies(
          debouncedSearchQuery.trim() || undefined,
        );
        setResults(companies);
        console.log('Fetched companies:', companies);
      } catch (err) {
        console.error('Failed to fetch companies:', err);
        setResults([]);
      }
    })();
  }, [focused, debouncedSearchQuery]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    onValueChange(newValue);
    setSearchQuery(newValue);
  }

  function handleFocus() {
    setFocused(true);
    setOpen(true);
    setSearchQuery(value);
  }

  function handleBlur() {
    setFocused(false);
  }

  return (
    <Autocomplete
      value={value}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={setOpen}
      items={results}
      itemToStringValue={(company: CompanyOption) => company?.name ?? ''}
    >
      <AutocompleteInput
        placeholder={placeholder}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        showClear
      />
      <AutocompleteContent>
        <AutocompleteEmpty>No companies found.</AutocompleteEmpty>
        <AutocompleteList>
          {(item) => (
            <AutocompleteItem key={item.id} value={item}>
              <CompanyLogo
                companyId={item.id}
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
