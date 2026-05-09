'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Company } from '@repo/db/entities/company';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@repo/ui/components/pagination';
import { CompanyCard } from './company-card';
import { useCompanyStore } from '../store';

interface CompaniesListProps {
  companies: Company[];
  currentPage: number;
  totalPages: number;
}

export function CompaniesList({
  companies,
  currentPage,
  totalPages,
}: CompaniesListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setCompanies = useCompanyStore((state) => state.setCompanies);

  // Sync initial data to store for dialog to work (matches applications pattern)
  useEffect(() => {
    setCompanies(companies);
  }, [companies, setCompanies]);

  function changePage(page: number) {
    if (page < 1 || page > totalPages) return;
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('page', page.toString());
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {companies.map((company) => (
          <CompanyCard key={company.id} company={company} />
        ))}
      </div>
      {totalPages > 1 && (
        <Pagination className="justify-center">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  changePage(currentPage - 1);
                }}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  isActive={page === currentPage}
                  onClick={(e) => {
                    e.preventDefault();
                    changePage(page);
                  }}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  changePage(currentPage + 1);
                }}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </>
  );
}
