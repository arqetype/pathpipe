'use client';

import { create } from 'zustand';
import type { Company } from '@repo/db/entities/company';

type CompanyStore = {
  companies: Company[];
  selectedCompanyId: string | null;
  setCompanies: (companies: Company[]) => void;
  selectCompany: (id: string | null) => void;
  patchCompany: (id: string, data: Partial<Company>) => Company | undefined;
  removeCompany: (id: string) => void;
};

export const useCompanyStore = create<CompanyStore>((set, get) => ({
  companies: [],
  selectedCompanyId: null,
  setCompanies: (companies) => set({ companies }),
  selectCompany: (id) => set({ selectedCompanyId: id }),
  patchCompany: (id, data) => {
    const previous = get().companies.find((c) => c.id === id);
    set((state) => ({
      companies: state.companies.map((company) =>
        company.id === id ? { ...company, ...data } : company,
      ),
    }));
    return previous;
  },
  removeCompany: (id) =>
    set((state) => ({
      companies: state.companies.filter((company) => company.id !== id),
    })),
}));
