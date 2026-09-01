import {
  Injectable,
  NotFoundException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import {
  ApplicationsQuery,
  LocationSuggestion,
  PaginatedApplications,
} from '@repo/db/query/application';
import { User } from '@repo/db/entities/user';
import { CreateApplicationDto } from '@repo/db/dto/application/create-application.dto';
import { Company } from '@repo/db/entities/company';
import { CompanyService } from '../company/company.service';

/** A query value that may arrive once or several times over. */
const toList = (value: string | string[] | undefined): string[] =>
  value === undefined
    ? []
    : (Array.isArray(value) ? value : [value])
        .map((entry) => entry.trim())
        .filter(Boolean);

@Injectable()
export class ApplicationService {
  constructor(
    @InjectRepository(Application)
    private readonly applicationsRepository: Repository<Application>,
    @Inject(forwardRef(() => CompanyService))
    private readonly companyService: CompanyService,
  ) {}

  async findMany(
    query: ApplicationsQuery,
    userId?: string,
  ): Promise<PaginatedApplications> {
    const {
      status,
      search,
      city,
      country,
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
      'city',
      'country',
    ];
    if (!allowedSortColumns.includes(sortBy)) {
      throw new Error(`Invalid sortBy value: ${sortBy}`);
    }

    const qb = this.applicationsRepository
      .createQueryBuilder('application')
      .leftJoin('application.user', 'user')
      .leftJoinAndSelect('application.company', 'company');

    if (userId) qb.where('user.id = :userId', { userId });

    if (status) {
      const statuses = Array.isArray(status) ? status : [status];
      qb.andWhere('application.status IN (:...statuses)', { statuses });
    }

    if (search) {
      qb.andWhere(
        `(company.name ILIKE :search
          OR application.position ILIKE :search
          OR application.city ILIKE :search
          OR application.country ILIKE :search)`,
        { search: `%${search}%` },
      );
    }

    const cities = toList(city);
    if (cities.length) {
      qb.andWhere('lower(application.city) IN (:...cities)', {
        cities: cities.map((value) => value.toLowerCase()),
      });
    }

    const countries = toList(country);
    if (countries.length) {
      qb.andWhere('upper(application.country) IN (:...countries)', {
        countries: countries.map((value) => value.toUpperCase()),
      });
    }

    qb.addSelect(
      `CASE application.tier WHEN 'S_TIER' THEN 1 WHEN 'A_TIER' THEN 2 WHEN 'B_TIER' THEN 3 ELSE 4 END`,
      'tier_rank',
    )
      .orderBy('tier_rank', 'ASC')
      .addOrderBy(
        `application.${sortBy}`,
        sortOrder.toUpperCase() as 'ASC' | 'DESC',
        // Most applications carry no location yet, and a page of blanks at the
        // top is not what "sort by location" was asked for.
        sortBy === 'city' || sortBy === 'country' ? 'NULLS LAST' : undefined,
      );

    const offset = (Number(page) - 1) * Number(limit);
    qb.skip(offset).take(Number(limit));

    const data = await qb.getMany();

    const totalQb = this.applicationsRepository
      .createQueryBuilder('application')
      .leftJoin('application.user', 'user');
    if (userId) totalQb.where('user.id = :userId', { userId });
    const total = await totalQb.getCount();

    return { data, total };
  }

  /**
   * Places to offer while somebody types, newest use first.
   *
   * Drawn from the offers we have scraped as well as the user's own
   * applications: a board that has published a role in Lyon is better evidence
   * that "Lyon" is spelled that way than anything a dropdown of our own could
   * hold, and the user's past entries keep their habits available.
   */
  async locationSuggestions(
    userId: string,
    query = '',
    limit = 20,
  ): Promise<LocationSuggestion[]> {
    const term = `%${query.trim()}%`;
    const rows = await this.applicationsRepository.manager.query<
      Array<{ city: string; country: string }>
    >(
      // Ranked by how many rows name the place, not alphabetically: the
      // scraped locations carry a long tail of junk ("01", "12 Locations")
      // that a name filter alone cannot catch, and real cities are the ones
      // that repeat. `places` must contain a letter for the same reason.
      `SELECT city, country FROM (
         SELECT coalesce(city, '') AS city,
                upper(coalesce(country, '')) AS country,
                count(*) * 10 AS uses
         FROM "application"
         WHERE "userId" = $1
           AND (coalesce(city, '') <> '' OR coalesce(country, '') <> '')
           AND ($2 = '' OR city ILIKE $3 OR country ILIKE $3)
         GROUP BY 1, 2
         UNION ALL
         SELECT coalesce(city, '') AS city,
                upper(coalesce(country, '')) AS country,
                count(*) AS uses
         FROM "job_posting_location"
         WHERE (city <> '' OR country <> '')
           AND ($2 = '' OR city ILIKE $3 OR country ILIKE $3)
           AND (city = '' OR (char_length(city) > 1 AND city ~ '[[:alpha:]]'))
           AND city !~* '^[0-9]+ +locations?$'
         GROUP BY 1, 2
       ) places
       GROUP BY city, country
       ORDER BY sum(uses) DESC, (city = '') ASC, city ASC
       LIMIT $4`,
      [userId, query.trim(), term, Math.min(Math.max(limit, 1), 50)],
    );
    return rows;
  }

  async findById(id: string): Promise<Application> {
    const application = await this.applicationsRepository.findOne({
      where: { id },
      relations: ['company'],
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
    const company: Company | undefined = companyName
      ? await this.companyService.findOrCreate(companyName)
      : undefined;

    const newApplication = this.applicationsRepository.create({
      ...dto,
      company,
      appliedAt: dto.appliedAt ? new Date(dto.appliedAt) : undefined,
      user,
    });
    return this.applicationsRepository.save(newApplication);
  }

  private async buildUpdatePayload(
    data: Partial<Application> & { companyName?: string },
  ) {
    const { companyName, ...rest } = data as Partial<Application> & {
      companyName?: string;
    };
    const payload: Record<string, unknown> = { ...rest };
    if (companyName !== undefined) {
      payload.company = companyName
        ? await this.companyService.findOrCreate(companyName)
        : null;
    }
    return payload;
  }

  async update(
    id: string,
    data: Partial<Application> & { companyName?: string },
  ): Promise<Application> {
    await this.findById(id);
    await this.applicationsRepository.update(
      id,
      await this.buildUpdatePayload(data),
    );
    return this.findById(id);
  }

  async updateByUser(
    id: string,
    userId: string,
    data: Partial<Application> & { companyName?: string },
  ): Promise<Application> {
    await this.findByIdAndUser(id, userId);
    await this.applicationsRepository.update(
      id,
      await this.buildUpdatePayload(data),
    );
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
