import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Company, CompanyStatus } from '@repo/db/entities/company';
import { CompanySearchResult } from '@repo/db/query/company';
import { UpdateCompanyDto } from '@repo/db/dto/company/update-company.dto';

@Injectable()
export class CompanyService {
  constructor(
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  async search(query: string, limit = 20): Promise<CompanySearchResult[]> {
    const trimmed = query?.trim() ?? '';
    const safeLimit = Math.min(Number(limit) || 20, 20);

    const qb = this.companiesRepository
      .createQueryBuilder('company')
      .select(['company.id', 'company.name', 'company.logoUrl'])
      .orderBy('company.name', 'ASC')
      .take(safeLimit)
      .where('company.status = :status', { status: CompanyStatus.APPROVED });

    if (trimmed) {
      qb.andWhere('company.name ILIKE :prefix', { prefix: `${trimmed}%` });
    }

    const companies = await qb.getMany();

    return companies.map((company) => ({
      id: company.id,
      name: company.name,
      logoUrl: company.logoUrl,
    }));
  }

  async findAll(): Promise<Company[]> {
    return this.companiesRepository.find({ order: { name: 'ASC' } });
  }

  async update(id: string, data: UpdateCompanyDto): Promise<Company> {
    const payload = {
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
}
