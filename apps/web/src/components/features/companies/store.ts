'use client';

import { create } from 'zustand';
import type { Company } from '@repo/db/entities/company';

type CompanyStore = {
  companies: Company[];
  setCompanies: (companies: Company[]) => void;
  patchCompany: (id: string, data: Partial<Company>) => Company | undefined;
  removeCompany: (id: string) => void;
};

export const useCompanyStore = create<CompanyStore>((set, get) => ({
  companies: [],
  setCompanies: (companies) => set({ companies }),
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
