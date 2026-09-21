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
import { UserFileService } from '../user/file/user-file.service';
import { UserFileKind } from '@repo/db/types/user-file/kind';
import { UserFile } from '@repo/db/entities/user-file';
import { JobEvent } from '@repo/db/entities/job-event';
import { JobEventType } from '@repo/db/types/job-event/type';
import {
  EVENT_FOR_STATUS,
  JobEventService,
  type JobDescriptionSnapshot,
} from '../job-event/job-event.service';

/** What an edit may carry, beyond the columns of the row itself. */
type ApplicationUpdate = Partial<Application> & {
  companyName?: string;
  resumeFileId?: string | null;
  coverLetterFileId?: string | null;
};

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
    private readonly userFileService: UserFileService,
    private readonly jobEventService: JobEventService,
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
      .leftJoinAndSelect('application.company', 'company')
      // Joined by hand because a query builder ignores `eager` — without
      // these, the board's own list reports every application as having no
      // CV attached, whatever is actually stored against it. The file bytes
      // stay behind: `content` is a `select: false` column.
      .leftJoinAndSelect('application.resumeFile', 'resumeFile')
      .leftJoinAndSelect('application.coverLetterFile', 'coverLetterFile');

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
    const saved = await this.applicationsRepository.save(newApplication);

    await this.jobEventService.record({
      userId: user.id,
      applicationId: saved.id,
      type: JobEventType.APPLICATION_CREATED,
      occurredAt: saved.created_at,
    });
    // Somebody adding a row they already sent gives the date; it belongs on the
    // event, not on today.
    await this.recordStatusChange(
      saved.id,
      user.id,
      ApplicationStatus.WISHLIST,
      saved.status,
      saved.appliedAt ?? undefined,
    );

    // Re-read: the status change above may have dated the row.
    return this.findById(saved.id);
  }

  /**
   * Turn a status change into the event behind it.
   *
   * Every path that writes `status` comes through here, including the generic
   * PATCH — that route takes an untyped body, so a card can be moved across the
   * board without ever touching `updateStatus`, and an event emitted only there
   * would miss most of what actually happens.
   *
   * A status re-applied to itself is not news and records nothing.
   */
  private async recordStatusChange(
    applicationId: string,
    ownerId: string,
    from: ApplicationStatus | undefined,
    to: ApplicationStatus | undefined,
    occurredAt?: Date,
  ): Promise<void> {
    if (!to || from === to) return;

    const type = EVENT_FOR_STATUS[to];
    if (!type) return;

    if (type === JobEventType.APPLICATION_SENT) {
      await this.stampAppliedAt(applicationId, occurredAt ?? new Date());
      await this.jobEventService.recordApplicationSent(
        ownerId,
        applicationId,
        occurredAt,
      );
      return;
    }

    await this.jobEventService.record({
      userId: ownerId,
      applicationId,
      type,
      occurredAt,
    });
  }

  /**
   * Date an application the day it goes out, unless it already carries one.
   *
   * The `IS NULL` lives in the statement rather than in a read-then-write: a
   * card dragged back and forth across the board would otherwise keep
   * re-dating itself to today, and the day somebody actually applied is the
   * one number the activity chart and the "no reply for 14 days" panel are
   * both counting from.
   */
  private async stampAppliedAt(
    applicationId: string,
    when: Date,
  ): Promise<void> {
    await this.applicationsRepository
      .createQueryBuilder()
      .update(Application)
      .set({ appliedAt: when })
      .where('id = :id', { id: applicationId })
      .andWhere('"appliedAt" IS NULL')
      .execute();
  }

  /**
   * Turn a document id from the request into a relation, having checked it.
   *
   * An id in a body is a claim about a file, not proof of one: without the
   * owner check, anybody could attach — and then read back through the
   * download route — a CV belonging to somebody else. `null` detaches.
   */
  private async resolveFileLink(
    fileId: string | null | undefined,
    ownerId: string,
    kind: UserFileKind,
  ): Promise<UserFile | null | undefined> {
    if (fileId === undefined) return undefined;
    if (fileId === null) return null;
    await this.userFileService.assertAttachable(fileId, ownerId, kind);
    return { id: fileId } as UserFile;
  }

  private async buildUpdatePayload(data: ApplicationUpdate, ownerId: string) {
    const { companyName, resumeFileId, coverLetterFileId, ...rest } = data;
    const payload: Record<string, unknown> = { ...rest };

    // Dropped rather than forwarded: this route takes an unvalidated body, so
    // a caller could otherwise set the relation directly and attach a file the
    // owner check below would have refused. The `*FileId` fields are the only
    // way in.
    delete payload.resumeFile;
    delete payload.coverLetterFile;
    if (companyName !== undefined) {
      payload.company = companyName
        ? await this.companyService.findOrCreate(companyName)
        : null;
    }

    const resumeFile = await this.resolveFileLink(
      resumeFileId,
      ownerId,
      UserFileKind.RESUME,
    );
    if (resumeFile !== undefined) payload.resumeFile = resumeFile;

    const coverLetterFile = await this.resolveFileLink(
      coverLetterFileId,
      ownerId,
      UserFileKind.COVER_LETTER,
    );
    if (coverLetterFile !== undefined)
      payload.coverLetterFile = coverLetterFile;

    return payload;
  }

  /** Who owns an application, for checks that must not trust the caller. */
  private async ownerOf(id: string): Promise<string> {
    const row = await this.applicationsRepository
      .createQueryBuilder('application')
      .select('application.id')
      .leftJoin('application.user', 'user')
      .addSelect('user.id')
      .where('application.id = :id', { id })
      .getOne();
    if (!row?.user) throw new NotFoundException();
    return row.user.id;
  }

  async update(id: string, data: ApplicationUpdate): Promise<Application> {
    const before = await this.findById(id);
    // An admin editing somebody else's board still may only attach that
    // person's documents, so the owner — not the caller — is what is checked.
    // The event is recorded against that owner too: it is their history.
    const ownerId = await this.ownerOf(id);
    await this.applicationsRepository.update(
      id,
      await this.buildUpdatePayload(data, ownerId),
    );
    await this.recordStatusChange(id, ownerId, before.status, data.status);
    return this.findById(id);
  }

  async updateByUser(
    id: string,
    userId: string,
    data: ApplicationUpdate,
  ): Promise<Application> {
    const before = await this.findByIdAndUser(id, userId);
    await this.applicationsRepository.update(
      id,
      await this.buildUpdatePayload(data, userId),
    );
    await this.recordStatusChange(id, userId, before.status, data.status);
    return this.findById(id);
  }

  async updateStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<Application> {
    const before = await this.findById(id);
    await this.applicationsRepository.update(id, { status });
    await this.recordStatusChange(
      id,
      await this.ownerOf(id),
      before.status,
      status,
    );
    return this.findById(id);
  }

  async updateStatusByUser(
    id: string,
    userId: string,
    status: ApplicationStatus,
  ): Promise<Application> {
    const before = await this.findByIdAndUser(id, userId);
    await this.applicationsRepository.update(id, { status });
    await this.recordStatusChange(id, userId, before.status, status);
    return this.findById(id);
  }

  /**
   * Everything that happened to one application.
   *
   * Ownership is checked here rather than in the controller so that no route can
   * read somebody else's history by knowing an id.
   */
  async timeline(id: string, userId: string): Promise<JobEvent[]> {
    await this.findByIdAndUser(id, userId);
    return this.jobEventService.timelineForApplication(userId, id);
  }

  /** The description as it read the day this application went out. */
  async snapshot(
    id: string,
    userId: string,
  ): Promise<JobDescriptionSnapshot | null> {
    await this.findByIdAndUser(id, userId);
    return this.jobEventService.snapshotForApplication(userId, id);
  }

  /** A follow-up, an interview, an answer — the things only the user knows. */
  async recordEvent(
    id: string,
    userId: string,
    type: JobEventType,
    occurredAt?: Date,
    note?: string,
  ): Promise<JobEvent> {
    await this.findByIdAndUser(id, userId);
    return this.jobEventService.recordUserEvent(
      userId,
      id,
      type,
      occurredAt,
      note,
    );
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
