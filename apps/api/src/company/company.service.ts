import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Company } from '@repo/db/entities/company';
import { CompanySearchResult } from '@repo/db/query/company';

@Injectable()
export class CompanyService implements OnModuleInit {
  private readonly logger = new Logger(CompanyService.name);

  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.dataSource.query(
        'CREATE INDEX IF NOT EXISTS company_name_varchar_pattern_ops_idx ON company (name varchar_pattern_ops)',
      );
    } catch (error) {
      this.logger.error(
        'Failed to ensure company name prefix index',
        error instanceof Error
          ? error.stack || error.message
          : JSON.stringify(error),
      );
    }
  }

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
