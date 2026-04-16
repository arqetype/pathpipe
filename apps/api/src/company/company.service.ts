import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company } from '@repo/db/entities/company';
import { CompanySearchResult } from '@repo/db/query/company';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  async search(query: string, limit = 10): Promise<CompanySearchResult[]> {
    const trimmed = query?.trim() ?? '';
    const safeLimit = Math.min(Number(limit) || 10, 10);

    const qb = this.companiesRepository
      .createQueryBuilder('company')
      .select(['company.id', 'company.name'])
      .orderBy('company.name', 'ASC')
      .take(safeLimit);

    if (trimmed) {
      qb.where('company.name ILIKE :prefix', { prefix: `${trimmed}%` });
    }

    const companies = await qb.getMany();

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
    }));
  }
}
