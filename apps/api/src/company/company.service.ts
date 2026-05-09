import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company, CompanyStatus } from '@repo/db/entities/company';
import {
  CompanySearchResult,
  CompaniesQuery,
  PaginatedCompanies,
} from '@repo/db/query/company';
import { UpdateCompanyDto } from '@repo/db/dto/company/update-company.dto';
import { CreateCompanyDto } from '@repo/db/dto/company/create-company.dto';
import { Application } from '@repo/db/entities/application';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,
  ) {}

  async suggestions(query: string, limit = 20): Promise<CompanySearchResult[]> {
    const trimmed = query?.trim() ?? '';
    const safeLimit = Math.min(Number(limit) || 20, 20);

    const qb = this.companiesRepository
      .createQueryBuilder('company')
      .select(['company.id', 'company.name'])
      .addSelect('similarity(company.name, :query)', 'similarity')
      .orderBy('similarity', 'DESC')
      .addOrderBy('company.name', 'ASC')
      .take(safeLimit)
      .where('company.status = :status', { status: CompanyStatus.APPROVED })
      .andWhere('(company.name % :query OR company.name ILIKE :pattern)', {
        query: trimmed,
        pattern: `%${trimmed}%`,
      });

    const companies = await qb.getMany();

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      // Frontend will request /api/companies/:id/logo to retrieve the blob
      logoUrl: `/api/companies/${company.id}/logo`,
    }));
  }

  async findAll(query: CompaniesQuery): Promise<PaginatedCompanies> {
    const {
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      status,
      industry,
      page = 1,
      limit = 12,
    } = query;

    const skip = (Number(page) - 1) * Number(limit);
    const safeLimit = Number(limit) || 12;
    const safeSortBy = sortBy as keyof Company;
    const safeSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

    const qb = this.companiesRepository
      .createQueryBuilder('company')
      .orderBy(`company.${safeSortBy}`, safeSortOrder);

    if (search) {
      qb.andWhere(
        '(company.name ILIKE :search OR company.industry::text ILIKE :search OR company.country ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      qb.andWhere('company.status IN (:...statuses)', { statuses });
    }

    if (industry) {
      const industries = Array.isArray(industry) ? industry : [industry];
      qb.andWhere('company.industry IN (:...industries)', { industries });
    }

    const [data, total] = await qb.skip(skip).take(safeLimit).getManyAndCount();

    const totalCounts: Record<CompanyStatus, number> = {
      [CompanyStatus.PENDING]: 0,
      [CompanyStatus.APPROVED]: 0,
      [CompanyStatus.REJECTED]: 0,
    };

    for (const status of Object.values(CompanyStatus)) {
      const countQb = this.companiesRepository
        .createQueryBuilder('company')
        .where('company.status = :status', { status });

      if (search) {
        countQb.andWhere(
          '(company.name ILIKE :search OR company.industry::text ILIKE :search OR company.country ILIKE :search)',
          { search: `%${search}%` },
        );
      }

      if (industry) {
        const industries = Array.isArray(industry) ? industry : [industry];
        countQb.andWhere('company.industry IN (:...industries)', {
          industries,
        });
      }

      totalCounts[status] = await countQb.getCount();
    }

    return { data, total, totalCounts };
  }

  async create(name: string): Promise<Company> {
    const company = this.companiesRepository.create({
      name,
      status: CompanyStatus.PENDING,
    });
    return this.companiesRepository.save(company);
  }

  async update(id: string, data: UpdateCompanyDto): Promise<Company> {
    const payload: Partial<Company> = {
      ...data,
      lastCheckedAt: data.lastCheckedAt
        ? new Date(data.lastCheckedAt)
        : undefined,
    };

    await this.companiesRepository.update({ id }, payload);
    return this.companiesRepository.findOneOrFail({ where: { id } });
  }

  async updateStatus(id: string, status: CompanyStatus): Promise<Company> {
    await this.companiesRepository.update({ id }, { status });
    return this.companiesRepository.findOneOrFail({ where: { id } });
  }

  async remove(id: string): Promise<void> {
    await this.applicationsRepository.delete({ company: { id } });
    await this.companiesRepository.delete({ id });
  }

  async createFromCsv(data: CreateCompanyDto): Promise<Company> {
    const company = this.companiesRepository.create({
      name: data.name,
      website: data.website,
      careersUrl: data.careersUrl,
      industry: data.industry,
      country: data.country,
      status: CompanyStatus.PENDING,
    });
    return this.companiesRepository.save(company);
  }

  async findAllForExport(
    query?: CompaniesQuery,
  ): Promise<{ data: Company[]; total: number }> {
    const qb = this.companiesRepository
      .createQueryBuilder('company')
      .orderBy('company.created_at', 'DESC');

    if (query?.search) {
      qb.andWhere(
        '(company.name ILIKE :search OR company.industry::text ILIKE :search OR company.country ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    if (query?.status) {
      const statuses = Array.isArray(query.status)
        ? query.status
        : [query.status];
      qb.andWhere('company.status IN (:...statuses)', { statuses });
    }

    if (query?.industry) {
      const industries = Array.isArray(query.industry)
        ? query.industry
        : [query.industry];
      qb.andWhere('company.industry IN (:...industries)', { industries });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }
}
