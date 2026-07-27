import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Company, CompanyStatus } from '@repo/db/entities/company';
import {
  CompanySearchResult,
  CompaniesQuery,
  PaginatedCompanies,
  WatchedCompany,
} from '@repo/db/query/company';
import { UpdateCompanyDto } from '@repo/db/dto/company/update-company.dto';
import { CreateCompanyDto } from '@repo/db/dto/company/create-company.dto';
import { Application } from '@repo/db/entities/application';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { CompanyImageService } from './company-image.service';

export interface CompanyWatchOverrides {
  careersUrl?: string | null;
  website?: string | null;
  notes?: string | null;
}

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,
    @InjectRepository(CompanyWatch)
    private readonly companyWatchRepository: Repository<CompanyWatch>,
    private readonly companyImageService: CompanyImageService,
  ) {}

  async findOrCreate(name: string): Promise<Company> {
    const trimmed = name.trim();
    let company = await this.companiesRepository.findOne({
      where: { name: trimmed },
    });
    if (!company) {
      company = await this.companiesRepository.save({
        name: trimmed,
        status: CompanyStatus.PENDING,
      });
      await this.companyImageService.fetchAndSaveLogo(company.id, trimmed);
    }
    return company;
  }

  async suggestions(
    query: string,
    userId: string,
    limit = 20,
  ): Promise<CompanySearchResult[]> {
    const trimmed = query?.trim() ?? '';
    const safeLimit = Math.min(Number(limit) || 20, 20);

    const qb = this.companiesRepository
      .createQueryBuilder('company')
      .select(['company.id', 'company.name'])
      .addSelect('similarity(company.name, :query)', 'similarity')
      .leftJoin(
        CompanyWatch,
        'watch',
        'watch."companyId" = company.id AND watch."userId" = :userId',
        { userId },
      )
      .orderBy('similarity', 'DESC')
      .addOrderBy('company.name', 'ASC')
      .take(safeLimit)
      .where('(company.status = :status OR watch.id IS NOT NULL)', {
        status: CompanyStatus.APPROVED,
      })
      .andWhere('(company.name % :query OR company.name ILIKE :pattern)', {
        query: trimmed,
        pattern: `%${trimmed}%`,
      });

    const companies = await qb.getMany();

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
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

  async setWatch(
    companyId: string,
    userId: string,
    watch: boolean,
  ): Promise<void> {
    if (watch) {
      try {
        await this.companyWatchRepository.insert({
          user: { id: userId },
          company: { id: companyId },
        });
      } catch (error) {
        const isDuplicateWatch =
          error instanceof QueryFailedError &&
          (error.driverError as { code?: string })?.code === '23505';
        if (!isDuplicateWatch) throw error;
      }
    } else {
      await this.companyWatchRepository.delete({
        user: { id: userId },
        company: { id: companyId },
      });
    }
  }

  async updateWatchOverrides(
    companyId: string,
    userId: string,
    data: CompanyWatchOverrides,
  ): Promise<void> {
    await this.companyWatchRepository.update(
      { user: { id: userId }, company: { id: companyId } },
      data,
    );
  }

  async findWatched(userId: string): Promise<WatchedCompany[]> {
    const { entities, raw } = await this.companyWatchRepository
      .createQueryBuilder('watch')
      .innerJoinAndSelect('watch.company', 'company')
      .leftJoin(
        Application,
        'application',
        'application."companyId" = company.id AND application."userId" = :userId',
        { userId },
      )
      .addSelect('COUNT(application.id)', 'applicationscount')
      .where('watch."userId" = :userId', { userId })
      .groupBy('watch.id')
      .addGroupBy('company.id')
      .orderBy('company.name', 'ASC')
      .getRawAndEntities<{ applicationscount: string }>();

    return entities.map((watch, index) => ({
      ...watch.company,
      careersUrl: watch.careersUrl ?? watch.company.careersUrl,
      website: watch.website ?? watch.company.website,
      notes: watch.notes,
      applicationsCount: Number(raw[index].applicationscount),
    }));
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
