'use client';

import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@repo/ui/components/combobox';
import { CompanyLogo } from './company-logo';

type CompanyOption = {
  id: string;
  name: string;
};

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
  const [query, setQuery] = useState(value ?? '');
  const [selectedId, setSelectedId] = useState<string>('');
  const [results, setResults] = useState<CompanyOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyOption | null>(
    null,
  );
  const requestIdRef = useRef(0);

  useEffect(() => {
    setQuery(value ?? '');
    setSelectedId('');
    setSelectedCompany(null);
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed && !isOpen) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const requestId = ++requestIdRef.current;

    const timeout = setTimeout(async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL;
        if (!baseUrl) {
          setResults([]);
          return;
        }

        const url = new URL('/companies', baseUrl);
        url.searchParams.set('query', trimmed);
        url.searchParams.set('limit', '10');

        const response = await fetch(url.toString(), {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch companies');
        }

        const data = (await response.json()) as CompanyOption[];
        if (requestIdRef.current === requestId) {
          setResults(data.slice(0, 10));
        }
      } catch {
        if (requestIdRef.current === requestId) {
          setResults([]);
        }
      } finally {
        if (requestIdRef.current === requestId) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [query, isOpen]);

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    setQuery(nextValue);
    setSelectedId('');
    setSelectedCompany(null);
    onChange(nextValue);
    setIsOpen(true);
  };

  const handleSelect = (company: CompanyOption | null) => {
    if (!company) return;
    setSelectedId(company.id);
    setSelectedCompany(company);
    setQuery(company.name);
    onChange(company.name);
    setIsOpen(false);
  };

  const handleBlur = () => {
    setIsFocused(false);
    window.setTimeout(() => setIsOpen(false), 100);
  };

  return (
    <Combobox
      items={results}
      value={selectedId}
      open={isOpen}
      onOpenChange={setIsOpen}
      onValueChange={(nextValue) => {
        const selected = results.find((company) => company.id === nextValue);
        if (!selected) {
          setSelectedId('');
          setSelectedCompany(null);
          return;
        }
        handleSelect(selected);
      }}
    >
      <ComboboxInput
        placeholder={placeholder}
        value={query}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        onBlur={handleBlur}
      />
      <ComboboxContent>
        <ComboboxEmpty>No items found.</ComboboxEmpty>
        <ComboboxList>
          {(item) => (
            <ComboboxItem key={item.id} value={item.id}>
              <span className="flex items-center gap-2">
                <CompanyLogo
                  name={item.name}
                  size={14}
                  className="size-3 shrink-0"
                />
                <span>{item.name}</span>
              </span>
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}
