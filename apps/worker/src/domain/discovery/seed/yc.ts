import type { HttpClient } from '@/infrastructure/http/http';

interface YcCompany {
  name: string;
  slug: string;
  status: string;
}

export const ycCompanies = async (
  http: HttpClient,
  limit: number,
): Promise<string[]> => {
  const names: string[] = [];

  for (let page = 1; names.length < limit; page++) {
    const payload = await http
      .json<{
        companies?: YcCompany[];
        totalPages?: number;
      }>(`https://api.ycombinator.com/v0.1/companies?page=${page}`, {
        skipRobots: true,
      })
      .catch(() => null);

    const companies = payload?.companies;
    if (!companies?.length) break;

    for (const company of companies) {
      if (company.status && company.status !== 'Active') continue;
      // Slugs are usually board tokens.
      if (company.slug) names.push(company.slug);
      else if (company.name) names.push(company.name);
    }

    if (payload.totalPages && page >= payload.totalPages) break;
  }

  return names.slice(0, limit);
};
