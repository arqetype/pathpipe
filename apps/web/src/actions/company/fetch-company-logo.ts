'use server';

import { getRaw } from '@/lib/fetch';
import { cache } from 'react';

export const fetchCompanyLogoAction = cache(
  async (id: string): Promise<string | void> => {
    const response = await getRaw(`/companies/${id}/logo`);
    if (!response) return;
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') ?? 'image/jpeg';
    return `data:${contentType};base64,${Buffer.from(buffer).toString('base64')}`;
  },
);
