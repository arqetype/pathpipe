import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import {
  ApplicationsQuery,
  PaginatedApplications,
} from '@repo/db/query/application';
import { User } from '@repo/db/entities/user';
import { CreateApplicationDto } from '@repo/db/dto/application/create-application.dto';
import { Company } from '@repo/db/entities/company';

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,
    @InjectRepository(Company)
    private readonly companiesRepository: Repository<Company>,
  ) {}

  async findMany(
    query: ApplicationsQuery,
    userId?: string,
  ): Promise<PaginatedApplications> {
    const {
      status,
      search,
      sortBy = 'created_at',
      sortOrder = 'desc',
      page = 1,
      limit = 20,
    } = query;

    const allowedSortColumns = [
      'created_at',
      'updated_at',
      'company',
      'position',
      'salaryMin',
      'salaryMax',
    ];
    if (!allowedSortColumns.includes(sortBy)) {
      throw new Error(`Invalid sortBy value: ${sortBy}`);
    }

    const qb = this.applicationsRepository
      .createQueryBuilder('application')
      .leftJoin('application.user', 'user');

    if (userId) qb.where('user.id = :userId', { userId });

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      qb.andWhere('application.status IN (:...statuses)', { statuses });
    }

    if (search) {
      qb.andWhere(
        '(application.company ILIKE :search OR application.position ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    qb.addSelect(
      `CASE application.tier WHEN 'S_TIER' THEN 1 WHEN 'A_TIER' THEN 2 WHEN 'B_TIER' THEN 3 ELSE 4 END`,
      'tier_rank',
    )
      .orderBy('tier_rank', 'ASC')
      .addOrderBy(
        `application.${sortBy}`,
        sortOrder.toUpperCase() as 'ASC' | 'DESC',
      );

    const offset = (Number(page) - 1) * Number(limit);
    qb.skip(offset).take(Number(limit));

    const [data, total] = await qb.getManyAndCount();
    return { data, total };
  }

  async findById(id: string): Promise<Application> {
    const application = await this.applicationsRepository.findOne({
      where: { id },
    });
    if (!application) throw new NotFoundException();
    return application;
  }

  async findByIdAndUser(id: string, userId: string): Promise<Application> {
    const application = await this.applicationsRepository.findOne({
      where: { id, user: { id: userId } },
    });
    if (!application) throw new NotFoundException();
    return application;
  }

  async create(user: User, dto: CreateApplicationDto): Promise<Application> {
    const companyName = dto.company?.trim();

    if (companyName) {
      await this.companiesRepository
        .createQueryBuilder()
        .insert()
        .into(Company)
        .values({ name: companyName })
        .orIgnore()
        .execute();
    }

    const newApplication = this.applicationsRepository.create({
      ...dto,
      company: companyName ?? dto.company,
      appliedAt: dto.appliedAt ? new Date(dto.appliedAt) : undefined,
      user,
    });
    return this.applicationsRepository.save(newApplication);
  }

  async update(id: string, data: Partial<Application>): Promise<Application> {
    await this.findById(id);
    await this.applicationsRepository.update(id, data);
    return this.findById(id);
  }

  async updateByUser(
    id: string,
    userId: string,
    data: Partial<Application>,
  ): Promise<Application> {
    await this.findByIdAndUser(id, userId);
    await this.applicationsRepository.update(id, data);
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<Application> {
    await this.findById(id);
    await this.applicationsRepository.update(id, { status });
    return this.findById(id);
  }

  async updateStatusByUser(
    id: string,
    userId: string,
    status: ApplicationStatus,
  ): Promise<Application> {
    await this.findByIdAndUser(id, userId);
    await this.applicationsRepository.update(id, { status });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.applicationsRepository.softDelete(id);
  }

  async removeByUser(id: string, userId: string): Promise<void> {
    await this.findByIdAndUser(id, userId);
    await this.applicationsRepository.softDelete(id);
  }
}
