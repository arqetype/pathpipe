'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
import { fetchCompaniesSuggestionsAction } from '@/actions/company/fetch-suggestions';
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
  onSelect?: (company: CompanyOption) => void;
  placeholder?: string;
  inputClassName?: string;
};

const DEBOUNCE_MS = 300;

export default function SelectCompany({
  value,
  onValueChange,
  onSelect,
  placeholder = 'Select a company',
  inputClassName,
}: SelectCompanyProps) {
  const [results, setResults] = useState<CompanyOption[]>([]);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setDisplayValue(value);
  }, [value]);

  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_MS);

  useEffect(() => {
    if (!focused) return;
    (async () => {
      try {
        const companies = await fetchCompaniesSuggestionsAction(
          debouncedSearchQuery.trim() || undefined,
        );
        setResults(companies);
      } catch (err) {
        console.error('Failed to fetch companies:', err);
        setResults([]);
      }
    })();
  }, [focused, debouncedSearchQuery]);

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    setDisplayValue(newValue);
    onValueChange(newValue);
    setSearchQuery(newValue);
  }

  function handleFocus() {
    setFocused(true);
    setOpen(true);
    setSearchQuery(displayValue);
  }

  function handleBlur() {
    setFocused(false);
  }

  return (
    <Autocomplete
      value={displayValue}
      onValueChange={(v) => {
        setDisplayValue(v);
        onValueChange(v);
      }}
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
        className={inputClassName}
      />
      <AutocompleteContent>
        <AutocompleteEmpty>No companies found.</AutocompleteEmpty>
        <AutocompleteList>
          {(item) => (
            <AutocompleteItem
              key={item.id}
              value={item}
              onClick={() => onSelect?.(item)}
            >
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
