'use client';

import { useEffect, useState } from 'react';
import { useDebounce } from '@repo/ui/hooks/use-debounce';
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

type CompanyOption = { id: string; name: string; logoUrl?: string };

type SelectCompanyProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

const DEBOUNCE_MS = 300;

export default function SelectCompany({
  value,
  onChange,
  placeholder = 'Select a company',
}: SelectCompanyProps) {
  const [results, setResults] = useState<CompanyOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const debouncedSearchQuery = useDebounce(searchQuery, DEBOUNCE_MS);

  console.log('searchQuery:', searchQuery, 'debounced:', debouncedSearchQuery);

  useEffect(() => {
    if (!focused) return;
    (async () => {
      setLoading(true);
      try {
        const companies = await fetchCompanies(
          debouncedSearchQuery.trim() || undefined,
        );
        console.log('Setting results:', companies);
        setResults(companies);
      } catch (err) {
        console.error('Failed to fetch companies:', err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [focused, debouncedSearchQuery]);

  function handleValueChange(selectedValue: string) {
    onChange(selectedValue);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newValue = e.target.value;
    onChange(newValue);
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
      onValueChange={handleValueChange}
      open={open}
      onOpenChange={setOpen}
      items={results}
      itemToStringValue={(company: CompanyOption) => company?.name ?? ''}
      getOptionValue={(company: CompanyOption) => company.id}
      autoHighlight
      filterOptions={false}
      filter={() => true}
    >
      <AutocompleteInput
        placeholder={placeholder}
        loading={loading}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        showClear
      />
      <AutocompleteContent>
        <AutocompleteEmpty>No companies found.</AutocompleteEmpty>
        <AutocompleteList>
          {(item: CompanyOption) => (
            <AutocompleteItem key={item.id} value={item}>
              <CompanyLogo
                name={item.name}
                logoUrl={item.logoUrl ?? ''}
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
