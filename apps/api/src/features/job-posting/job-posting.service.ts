import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  In,
  IsNull,
  QueryFailedError,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingLocation } from '@repo/db/entities/job-posting-location';
import { JobPostingInteraction } from '@repo/db/entities/job-posting-interaction';
import { JobPreference } from '@repo/db/entities/job-preference';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { Application } from '@repo/db/entities/application';
import { User } from '@repo/db/entities/user';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import { JobPostingClosedReason } from '@repo/db/types/job-posting/closed-reason';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';
import { ReconcileJobPostingsDto } from '@repo/db/dto/job-posting/reconcile-job-postings.dto';
import { JobPostingValidityDto } from '@repo/db/dto/job-posting/job-posting-validity.dto';
import {
  JobPostingFacet,
  JobPostingFacets,
  JobPostingResponse,
  JobPostingsQuery,
  PaginatedJobPostings,
} from '@repo/db/query/job-posting';
import {
  buildExclusionPredicate,
  buildMatchPredicate,
  buildMatchReasons,
  buildMatchSql,
  isConfigured,
} from './job-match';

export interface InsertedJobSummary {
  id: string;
  title: string;
  url: string;
  location: string | null;
}

/** Rows per INSERT, kept far below Postgres' bind-parameter cap. */
const BATCH_CHUNK_SIZE = 200;

/** Rows per merge statement — it binds many more parameters per row. */
const MERGE_CHUNK_SIZE = 100;

/** How far back an offer counts as "new" on the board. */
const NEW_WINDOW_DAYS = 7;

export interface BatchCreateResult {
  inserted: number;
  total: number;
  /**
   * The rows that were actually new. Alert digests are built from this, so they
   * can never claim an offer that has been on the board for weeks.
   */
  jobs: InsertedJobSummary[];
}

/** One offer's URL, for the worker's validity probe. */
export interface StalePostingSummary {
  id: string;
  url: string;
}

/** Filter dimensions, so a facet can exclude its own. */
type FilterDimension =
  | 'companyId'
  | 'city'
  | 'country'
  | 'department'
  | 'employmentType'
  | 'remoteType';

/** The per-user context every board query is answered in. */
interface Viewer {
  userId: string;
  preference: JobPreference | null;
  followsAny: boolean;
}

const toArray = <T>(value: T | T[] | undefined): T[] =>
  value === undefined ? [] : Array.isArray(value) ? value : [value];

const toBoolean = (
  value: boolean | string | undefined,
): boolean | undefined => {
  if (value === undefined || value === '') return undefined;
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
};

const toInt = (value: number | string | undefined): number | undefined => {
  if (value === undefined || value === '') return undefined;
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
};

/** Terms honoured in one search; beyond this the query stops discriminating. */
const MAX_SEARCH_TERMS = 8;

/**
 * A `tsquery` from whatever the user typed.
 *
 * Every term is stripped to letters, digits and the few symbols that carry
 * meaning in a job title (`c++`, `node.js`), then quoted — so nothing the user
 * types can be read as a `tsquery` operator. Each term is prefix-matched, which
 * is what makes "engineer" find "engineers" under the unstemmed 'simple'
 * dictionary, and makes the search feel live as the user types.
 *
 * Terms are ANDed: adding a word narrows, which is what a filter bar implies.
 */
const toTsQuery = (raw: string): string | null => {
  const terms = raw
    .toLowerCase()
    .split(/[^\p{L}\p{N}+#.]+/u)
    .map((term) => term.replace(/^[.+#]+|[.+#]+$/g, ''))
    .filter((term) => term.length > 0)
    .slice(0, MAX_SEARCH_TERMS);

  if (!terms.length) return null;
  return terms.map((term) => `'${term}':*`).join(' & ');
};

@Injectable()
export class JobPostingService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly jobPostingRepository: Repository<JobPosting>,
    @InjectRepository(JobPostingLocation)
    private readonly locationRepository: Repository<JobPostingLocation>,
    @InjectRepository(JobPostingInteraction)
    private readonly interactionRepository: Repository<JobPostingInteraction>,
    @InjectRepository(JobPreference)
    private readonly preferenceRepository: Repository<JobPreference>,
    @InjectRepository(CompanyWatch)
    private readonly companyWatchRepository: Repository<CompanyWatch>,
    @InjectRepository(Application)
    private readonly applicationRepository: Repository<Application>,
  ) {}

  // ---------------------------------------------------------------- ingestion

  /**
   * Writes one crawl's worth of offers.
   *
   * Offers are global — one row per (company, URL) no matter how many users are
   * interested — so this takes no user at all. Three statements per chunk: an
   * insert that reports what was genuinely new, a merge that refreshes what
   * already existed, and a reconciliation of each offer's places.
   */
  async createBatch(dtos: CreateJobPostingDto[]): Promise<BatchCreateResult> {
    if (!dtos.length) return { inserted: 0, total: 0, jobs: [] };

    const seenAt = new Date();
    const rows = dtos.map((dto) => this.toRow(dto, seenAt));
    const jobs: InsertedJobSummary[] = [];

    for (let start = 0; start < rows.length; start += BATCH_CHUNK_SIZE) {
      const chunk = rows.slice(start, start + BATCH_CHUNK_SIZE);
      jobs.push(...(await this.insertChunk(chunk)));
    }

    for (let start = 0; start < dtos.length; start += MERGE_CHUNK_SIZE) {
      const chunk = dtos.slice(start, start + MERGE_CHUNK_SIZE);
      await this.mergeChunk(chunk, seenAt);
      await this.syncLocations(chunk);
    }

    return { inserted: jobs.length, total: dtos.length, jobs };
  }

  /**
   * One statement with ON CONFLICT DO NOTHING: the returned rows are exactly
   * the postings that did not exist yet, whichever unique constraint would have
   * caught them (the URL, or the ATS id for boards that rewrite their slugs).
   */
  private async insertChunk(
    chunk: QueryDeepPartialEntity<JobPosting>[],
  ): Promise<InsertedJobSummary[]> {
    try {
      const result = await this.jobPostingRepository
        .createQueryBuilder()
        .insert()
        .into(JobPosting)
        .values(chunk)
        .orIgnore()
        .returning(['id', 'title', 'url', 'location'])
        .execute();

      return (result.raw as InsertedJobSummary[]) ?? [];
    } catch (err) {
      if (!this.isUniqueViolation(err)) throw err;
      const fallback = await this.createBatchRowByRow(chunk, chunk.length);
      return fallback.jobs;
    }
  }

  /**
   * Refreshes the offers that already existed.
   *
   * Matching is by URL, or by ATS id for boards that rewrote the slug — those
   * keep their stored URL, which still redirects, but must not be mistaken for
   * a posting that vanished. `COALESCE` means a pass that knows less than the
   * last one leaves the record alone instead of blanking it, and seeing the
   * offer at all reopens it if a previous pass had closed it.
   */
  private async mergeChunk(
    dtos: CreateJobPostingDto[],
    seenAt: Date,
  ): Promise<void> {
    if (!dtos.length) return;

    const params: unknown[] = [];
    const tuples = dtos.map((dto) => {
      const values = [
        dto.companyId,
        dto.url,
        dto.externalId ?? null,
        dto.title,
        dto.description ?? null,
        dto.descriptionHtml ?? null,
        dto.location ?? null,
        dto.department ?? null,
        dto.employmentType ?? null,
        dto.remoteType ?? null,
        dto.salaryMin ?? null,
        dto.salaryMax ?? null,
        dto.salaryCurrency ?? null,
        dto.source ?? null,
        dto.postedAt ?? null,
        dto.validThrough ?? null,
      ];
      const casts = [
        'uuid',
        'text',
        'text',
        'text',
        'text',
        'text',
        'text',
        'text',
        'job_posting_employmenttype_enum',
        'job_posting_remotetype_enum',
        'int',
        'int',
        'text',
        'text',
        'timestamptz',
        'timestamptz',
      ];
      const placeholders = values.map((value, index) => {
        params.push(value);
        return `$${params.length}::${casts[index]}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    params.push(seenAt);
    const seenAtParam = `$${params.length}::timestamptz`;

    await this.jobPostingRepository.query(
      `UPDATE "job_posting" AS jp SET
         "title" = COALESCE(v.title, jp."title"),
         "externalId" = COALESCE(v."externalId", jp."externalId"),
         "description" = COALESCE(v.description, jp."description"),
         "descriptionHtml" = COALESCE(v."descriptionHtml", jp."descriptionHtml"),
         "location" = COALESCE(v.location, jp."location"),
         "department" = COALESCE(v.department, jp."department"),
         "employmentType" = COALESCE(v."employmentType", jp."employmentType"),
         "remoteType" = COALESCE(v."remoteType", jp."remoteType"),
         "salaryMin" = COALESCE(v."salaryMin", jp."salaryMin"),
         "salaryMax" = COALESCE(v."salaryMax", jp."salaryMax"),
         "salaryCurrency" = COALESCE(v."salaryCurrency", jp."salaryCurrency"),
         "source" = COALESCE(v.source, jp."source"),
         "postedAt" = COALESCE(v."postedAt", jp."postedAt"),
         "validThrough" = COALESCE(v."validThrough", jp."validThrough"),
         "detailFetchedAt" = CASE
           WHEN v.description IS NOT NULL THEN ${seenAtParam}
           ELSE jp."detailFetchedAt"
         END,
         "lastSeenAt" = ${seenAtParam},
         "closedAt" = NULL,
         "closedReason" = NULL,
         "updatedAt" = ${seenAtParam}
       FROM (VALUES ${tuples.join(', ')}) AS v(
         "companyId", url, "externalId", title, description, "descriptionHtml",
         location, department, "employmentType", "remoteType", "salaryMin",
         "salaryMax", "salaryCurrency", source, "postedAt", "validThrough"
       )
       WHERE jp."companyId" = v."companyId"
         AND (
           jp."url" = v.url
           OR (v."externalId" IS NOT NULL AND jp."externalId" = v."externalId")
         )`,
      params,
    );
  }

  /**
   * Brings each offer's places in line with what the board last said.
   *
   * Insert-if-absent then delete-what-is-gone, rather than delete-then-insert:
   * a crawl that changed nothing writes nothing, which matters when every full
   * pass resubmits every offer on every board.
   */
  private async syncLocations(dtos: CreateJobPostingDto[]): Promise<void> {
    const withLocations = dtos.filter((dto) => dto.locations?.length);
    if (!withLocations.length) return;

    // The insert reported ids only for offers that were new, so the ids are
    // resolved here for the whole chunk at once.
    const ids = await this.jobPostingRepository
      .createQueryBuilder('job')
      .select('job.id', 'id')
      .addSelect('job.url', 'url')
      .addSelect('job.companyId', 'companyId')
      .where('job.companyId IN (:...companyIds)', {
        companyIds: [...new Set(withLocations.map((dto) => dto.companyId))],
      })
      .andWhere('job.url IN (:...urls)', {
        urls: withLocations.map((dto) => dto.url),
      })
      .getRawMany<{ id: string; url: string; companyId: string }>();

    const idByKey = new Map(
      ids.map((row) => [`${row.companyId}|${row.url}`, row.id]),
    );

    const rows: Array<[string, string, string, string, string]> = [];
    for (const dto of withLocations) {
      const postingId = idByKey.get(`${dto.companyId}|${dto.url}`);
      if (!postingId) continue;
      for (const location of dto.locations ?? []) {
        rows.push([
          postingId,
          (location.city ?? '').slice(0, 120),
          (location.region ?? '').slice(0, 120),
          (location.country ?? '').slice(0, 8).toUpperCase(),
          (location.raw ?? '').slice(0, 200),
        ]);
      }
    }
    if (!rows.length) return;

    const params: unknown[] = [];
    const tuples = rows.map((row) => {
      const placeholders = row.map((value, index) => {
        params.push(value);
        return `$${params.length}::${index === 0 ? 'uuid' : 'text'}`;
      });
      return `(${placeholders.join(', ')})`;
    });

    // One statement, so the tuples are bound once: a CTE holds what the board
    // said, the insert adds what is missing, and the delete removes what it
    // stopped saying. Both arms read the same snapshot, so a place inserted
    // here can never be deleted by the same statement.
    await this.locationRepository.query(
      `WITH incoming AS (
         SELECT * FROM (VALUES ${tuples.join(', ')})
           AS v("jobPostingId", city, region, country, raw)
       ), added AS (
         INSERT INTO "job_posting_location" ("jobPostingId", "city", "region", "country", "raw")
         SELECT i."jobPostingId", i.city, i.region, i.country, i.raw FROM incoming i
         ON CONFLICT ("jobPostingId", "city", "region", "country") DO NOTHING
         RETURNING 1
       )
       DELETE FROM "job_posting_location" l
       WHERE l."jobPostingId" IN (SELECT DISTINCT "jobPostingId" FROM incoming)
         AND NOT EXISTS (
           SELECT 1 FROM incoming i
           WHERE i."jobPostingId" = l."jobPostingId"
             AND i.city = l."city"
             AND i.region = l."region"
             AND i.country = l."country"
         )`,
      params,
    );
  }

  /** Fallback for the rare case the bulk statement is rejected. */
  private async createBatchRowByRow(
    rows: QueryDeepPartialEntity<JobPosting>[],
    total: number,
  ): Promise<BatchCreateResult> {
    const jobs: InsertedJobSummary[] = [];
    for (const row of rows) {
      try {
        const result = await this.jobPostingRepository.insert(row);
        const identifier = result.identifiers[0];
        if (identifier?.id) {
          jobs.push({
            id: String(identifier.id),
            title: String(row.title),
            url: String(row.url),
            location: (row.location as string | null) ?? null,
          });
        }
      } catch (err) {
        if (!this.isUniqueViolation(err)) throw err;
      }
    }
    return { inserted: jobs.length, total, jobs };
  }

  private toRow(
    dto: CreateJobPostingDto,
    seenAt: Date,
  ): QueryDeepPartialEntity<JobPosting> {
    return {
      title: dto.title,
      url: dto.url,
      externalId: dto.externalId ?? null,
      description: dto.description ?? null,
      descriptionHtml: dto.descriptionHtml ?? null,
      location: dto.location ?? null,
      department: dto.department ?? null,
      employmentType: dto.employmentType ?? null,
      remoteType: dto.remoteType ?? null,
      salaryMin: dto.salaryMin ?? null,
      salaryMax: dto.salaryMax ?? null,
      salaryCurrency: dto.salaryCurrency ?? null,
      source: dto.source ?? null,
      postedAt: dto.postedAt ? new Date(dto.postedAt) : null,
      validThrough: dto.validThrough ? new Date(dto.validThrough) : null,
      lastSeenAt: seenAt,
      detailFetchedAt: dto.description ? seenAt : null,
      companyId: dto.companyId,
    };
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      err instanceof QueryFailedError &&
      (err as QueryFailedError & { driverError?: { code?: string } })
        .driverError?.code === '23505'
    );
  }

  // ---------------------------------------------------------------- lifecycle

  /**
   * Closes the offers a board no longer lists.
   *
   * Called only after a complete crawl of one source: the caller is asserting
   * "these are all the offers that exist there right now", which is the only
   * evidence strong enough to take an offer off the board.
   */
  async reconcile(dto: ReconcileJobPostingsDto): Promise<{ closed: number }> {
    const urls = dto.urls ?? [];
    const externalIds = dto.externalIds ?? [];
    if (!urls.length && !externalIds.length) return { closed: 0 };

    const qb = this.jobPostingRepository
      .createQueryBuilder()
      .update(JobPosting)
      .set({
        closedAt: () => 'now()',
        closedReason: JobPostingClosedReason.REMOVED_FROM_LISTING,
      })
      .where('"companyId" = :companyId', { companyId: dto.companyId })
      .andWhere('"source" = :source', { source: dto.source })
      .andWhere('"closedAt" IS NULL');

    if (urls.length) {
      qb.andWhere('"url" NOT IN (:...urls)', { urls });
    }
    if (externalIds.length) {
      qb.andWhere(
        new Brackets((w) => {
          w.where('"externalId" IS NULL').orWhere(
            '"externalId" NOT IN (:...externalIds)',
            { externalIds },
          );
        }),
      );
    }

    const result = await qb.execute();
    return { closed: result.affected ?? 0 };
  }

  /**
   * Open offers most overdue for a "does this still exist?" probe.
   *
   * Ordered oldest-check-first so the queue drains evenly, and offers somebody
   * saved or applied to jump ahead of the rest.
   */
  async findStale(
    limit: number,
    olderThanHours: number,
  ): Promise<StalePostingSummary[]> {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);

    return this.jobPostingRepository
      .createQueryBuilder('job')
      .select('job.id', 'id')
      .addSelect('job.url', 'url')
      .where('job.closedAt IS NULL')
      .andWhere(
        new Brackets((w) => {
          w.where('job.lastValidatedAt IS NULL').orWhere(
            'job.lastValidatedAt < :cutoff',
            { cutoff },
          );
        }),
      )
      .orderBy(
        `CASE WHEN EXISTS (
           SELECT 1 FROM "job_posting_interaction" i
           WHERE i."jobPostingId" = job."id"
             AND (i."saved" OR i."applicationId" IS NOT NULL)
         ) THEN 0 ELSE 1 END`,
        'ASC',
      )
      .addOrderBy('job.lastValidatedAt', 'ASC', 'NULLS FIRST')
      .limit(Math.min(Math.max(limit, 1), 500))
      .getRawMany<StalePostingSummary>();
  }

  /** Records what the worker's probe found, one statement per verdict group. */
  async applyValidity(
    results: JobPostingValidityDto[],
  ): Promise<{ closed: number; confirmed: number }> {
    const alive = results.filter((r) => r.alive).map((r) => r.id);
    const dead = results.filter((r) => !r.alive);

    if (alive.length) {
      await this.jobPostingRepository.update(
        { id: In(alive) },
        { lastValidatedAt: new Date() },
      );
    }

    let closed = 0;
    // Grouped by reason so each group is a single statement.
    const byReason = new Map<JobPostingClosedReason, string[]>();
    for (const verdict of dead) {
      const reason = verdict.reason ?? JobPostingClosedReason.DEAD_LINK;
      byReason.set(reason, [...(byReason.get(reason) ?? []), verdict.id]);
    }
    for (const [reason, ids] of byReason) {
      const result = await this.jobPostingRepository.update(
        { id: In(ids), closedAt: IsNull() },
        {
          closedAt: new Date(),
          closedReason: reason,
          lastValidatedAt: new Date(),
        },
      );
      closed += result.affected ?? 0;
    }

    return { closed, confirmed: alive.length };
  }

  /**
   * Closes offers whose own advertised expiry has passed.
   *
   * Cheap to run and needs no network, so it complements the probe rather than
   * waiting for one.
   */
  async closeExpired(): Promise<number> {
    const result = await this.jobPostingRepository
      .createQueryBuilder()
      .update(JobPosting)
      .set({
        closedAt: () => 'now()',
        closedReason: JobPostingClosedReason.EXPIRED,
      })
      .where('"closedAt" IS NULL')
      .andWhere('"validThrough" IS NOT NULL')
      .andWhere('"validThrough" < now()')
      .execute();
    return result.affected ?? 0;
  }

  // ------------------------------------------------------------------ reading

  /** Everything about the viewer that every board query needs. */
  async viewer(userId: string): Promise<Viewer> {
    const [preference, follows] = await Promise.all([
      this.preferenceRepository.findOne({ where: { userId } }),
      this.companyWatchRepository.count({ where: { user: { id: userId } } }),
    ]);
    return { userId, preference, followsAny: follows > 0 };
  }

  /** Applies every active filter except the dimensions named in `skip`. */
  private buildQuery(
    viewer: Viewer,
    query: JobPostingsQuery,
    skip: FilterDimension[] = [],
    selectCompany = false,
  ): SelectQueryBuilder<JobPosting> {
    const match = buildMatchSql(viewer.userId, viewer);
    const qb = this.jobPostingRepository.createQueryBuilder('job');
    if (selectCompany) {
      qb.innerJoinAndSelect('job.company', 'company');
    } else {
      qb.innerJoin('job.company', 'company');
    }
    qb.leftJoin(
      JobPostingInteraction,
      'interaction',
      'interaction."jobPostingId" = job.id AND interaction."userId" = :viewerId',
      { viewerId: viewer.userId },
    );
    qb.where('1 = 1');

    if (!toBoolean(query.includeClosed)) {
      qb.andWhere('job.closedAt IS NULL');
    }

    // An offer nobody has touched reads as NEW, which is the state that has no
    // interaction row at all — hence the COALESCE rather than a plain compare.
    const statuses = toArray(query.status);
    if (statuses.length) {
      qb.andWhere(`COALESCE(interaction."status", 'NEW') IN (:...statuses)`, {
        statuses,
      });
    }

    const companyIds = toArray(query.companyId);
    if (companyIds.length && !skip.includes('companyId')) {
      qb.andWhere('job.companyId IN (:...companyIds)', { companyIds });
    }

    const cities = toArray(query.city);
    if (cities.length && !skip.includes('city')) {
      qb.andWhere(
        `EXISTS (
           SELECT 1 FROM "job_posting_location" fl
           WHERE fl."jobPostingId" = job.id AND fl."city" IN (:...cities)
         )`,
        { cities },
      );
    }

    const countries = toArray(query.country);
    if (countries.length && !skip.includes('country')) {
      qb.andWhere(
        `EXISTS (
           SELECT 1 FROM "job_posting_location" fl
           WHERE fl."jobPostingId" = job.id AND fl."country" IN (:...countries)
         )`,
        { countries: countries.map((code) => code.toUpperCase()) },
      );
    }

    const departments = toArray(query.department);
    if (departments.length && !skip.includes('department')) {
      qb.andWhere('job.department IN (:...departments)', { departments });
    }

    const employmentTypes = toArray(query.employmentType);
    if (employmentTypes.length && !skip.includes('employmentType')) {
      qb.andWhere('job.employmentType IN (:...employmentTypes)', {
        employmentTypes,
      });
    }

    const remoteTypes = toArray(query.remoteType);
    if (remoteTypes.length && !skip.includes('remoteType')) {
      qb.andWhere('job.remoteType IN (:...remoteTypes)', { remoteTypes });
    }

    const salaryMin = toInt(query.salaryMin);
    if (salaryMin !== undefined) {
      // An offer with no salary published is not evidence that it pays less.
      qb.andWhere(
        '(job.salaryMax >= :salaryMin OR job.salaryMin >= :salaryMin)',
        { salaryMin },
      );
    }

    const postedWithinDays = toInt(query.postedWithinDays);
    if (postedWithinDays !== undefined && postedWithinDays > 0) {
      const since = new Date(Date.now() - postedWithinDays * 86_400_000);
      // Offers with no publication date fall back to when we first saw them.
      qb.andWhere('COALESCE(job.postedAt, job.createdAt) >= :since', { since });
    }

    if (toBoolean(query.saved)) {
      qb.andWhere('interaction."saved" = true');
    }

    const tracked = toBoolean(query.tracked);
    if (tracked !== undefined) {
      qb.andWhere(
        tracked
          ? 'interaction."applicationId" IS NOT NULL'
          : 'interaction."applicationId" IS NULL',
      );
    }

    if (toBoolean(query.followed)) {
      qb.andWhere(
        `EXISTS (
           SELECT 1 FROM "company_watch" fw
           WHERE fw."companyId" = job."companyId" AND fw."userId" = :viewerId
         )`,
      );
    }

    // Asking not to see something is unambiguous, so exclusions apply whether
    // or not the "only matches" toggle is on.
    const exclusion = buildExclusionPredicate(viewer.preference);
    if (exclusion) {
      qb.andWhere(exclusion.sql, exclusion.params);
    }

    if (toBoolean(query.onlyMatches)) {
      const predicate = buildMatchPredicate(viewer.preference);
      if (predicate) qb.andWhere(`(${predicate.sql})`, predicate.params);
    }

    // The band is applied to the same expression the list is ranked by, so what
    // the slider says and what the rows show can never disagree. Without a
    // profile there is no score to band, and the filter is simply ignored.
    const minScore = toInt(query.minScore);
    const maxScore = toInt(query.maxScore);
    if (match && (minScore !== undefined || maxScore !== undefined)) {
      qb.setParameters(match.params);
      if (minScore !== undefined && minScore > 0) {
        qb.andWhere(`${match.score} >= :minScore`, { minScore });
      }
      if (maxScore !== undefined && maxScore < 100) {
        qb.andWhere(`${match.score} <= :maxScore`, { maxScore });
      }
    }

    const search = query.search?.trim();
    const tsquery = search ? toTsQuery(search) : null;
    if (search) {
      qb.andWhere(
        new Brackets((w) => {
          // The company sits in another table, so it cannot be part of the
          // offer's generated vector — but there are few companies and they are
          // already joined, so a LIKE over them costs nothing.
          w.where('company.name ILIKE :searchLike', {
            searchLike: `%${search}%`,
          });
          if (tsquery) {
            w.orWhere(
              `"job"."searchVector" @@ to_tsquery('simple', :tsquery)`,
              {
                tsquery,
              },
            );
          }
        }),
      );
    }

    return qb;
  }

  /** The `tsquery` the current search resolves to, or null when there is none. */
  private tsQueryOf(query: JobPostingsQuery): string | null {
    const search = query.search?.trim();
    return search ? toTsQuery(search) : null;
  }

  private applySort(
    qb: SelectQueryBuilder<JobPosting>,
    query: JobPostingsQuery,
    hasMatch: boolean,
  ): void {
    const direction = query.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const tsquery = this.tsQueryOf(query);

    // Defaults, in the order a job seeker wants them: what you typed, then how
    // well it fits you, then how fresh it is.
    const requested =
      query.sortBy ?? (tsquery ? 'relevance' : hasMatch ? 'match' : 'postedAt');

    if (requested === 'match' && hasMatch) {
      qb.orderBy('match_score', 'DESC')
        .addOrderBy('COALESCE(job.postedAt, job.createdAt)', 'DESC')
        .addOrderBy('job.id', 'ASC');
      return;
    }

    if (requested === 'relevance' && tsquery) {
      qb.addSelect(
        `ts_rank_cd("job"."searchVector", to_tsquery('simple', :tsquery), 32)`,
        'search_rank',
      )
        .setParameter('tsquery', tsquery)
        .orderBy('search_rank', 'DESC')
        // Two offers of equal rank are ordered by freshness, never arbitrarily.
        .addOrderBy('COALESCE(job.postedAt, job.createdAt)', 'DESC')
        .addOrderBy('job.id', 'ASC');
      return;
    }

    switch (requested) {
      case 'title':
        qb.orderBy('job.title', direction);
        break;
      case 'salaryMax':
        qb.orderBy('job.salaryMax', direction, 'NULLS LAST');
        break;
      case 'company':
        qb.orderBy('company.name', direction);
        break;
      case 'createdAt':
        qb.orderBy('job.createdAt', direction);
        break;
      default:
        // Freshness is what the board is for; offers with no published date sit
        // where we first saw them rather than at the bottom forever.
        qb.orderBy('COALESCE(job.postedAt, job.createdAt)', direction);
    }
    qb.addOrderBy('job.id', 'ASC');
  }

  async findMany(
    userId: string,
    query: JobPostingsQuery,
  ): Promise<PaginatedJobPostings> {
    const viewer = await this.viewer(userId);
    const page = Math.max(toInt(query.page) ?? 1, 1);
    const limit = Math.min(Math.max(toInt(query.limit) ?? 25, 1), 100);

    const match = buildMatchSql(userId, viewer);

    // `offset`/`limit` rather than `skip`/`take`: every join here is
    // many-to-one and so cannot multiply rows, and this avoids the DISTINCT
    // subquery `skip`/`take` builds, which cannot carry the expressions this
    // list is ordered by. The offers' places are loaded separately for the same
    // reason — that one *is* a one-to-many.
    const qb = this.buildQuery(viewer, query, [], true)
      .addSelect('interaction.status', 'i_status')
      .addSelect('interaction.saved', 'i_saved')
      .addSelect('interaction.applicationId', 'i_application')
      .offset((page - 1) * limit)
      .limit(limit);

    if (match) {
      qb.addSelect(match.score, 'match_score').setParameters(match.params);
    }
    this.applySort(qb, query, Boolean(match));

    const [{ entities, raw }, total] = await Promise.all([
      qb.getRawAndEntities<Record<string, unknown>>(),
      qb.getCount(),
    ]);

    const [locations, followed, facets, newCount] = await Promise.all([
      this.locationsFor(entities.map((job) => job.id)),
      this.followedCompanies(userId),
      this.facets(viewer, query),
      this.countNew(userId, viewer),
    ]);

    return {
      data: entities.map((job, index) =>
        this.toResponse(job, {
          raw: raw[index] ?? {},
          locations: locations.get(job.id) ?? [],
          followed: followed.has(job.companyId),
          preference: viewer.preference,
        }),
      ),
      total,
      page,
      limit,
      facets,
      newCount,
      hasProfile: isConfigured(viewer.preference),
    };
  }

  /** Places for a page of offers, in one query rather than one per offer. */
  private async locationsFor(
    ids: string[],
  ): Promise<Map<string, JobPostingLocation[]>> {
    const byPosting = new Map<string, JobPostingLocation[]>();
    if (!ids.length) return byPosting;

    const rows = await this.locationRepository.find({
      where: { jobPostingId: In(ids) },
    });
    for (const row of rows) {
      byPosting.set(row.jobPostingId, [
        ...(byPosting.get(row.jobPostingId) ?? []),
        row,
      ]);
    }
    return byPosting;
  }

  private async followedCompanies(userId: string): Promise<Set<string>> {
    const rows = await this.companyWatchRepository.find({
      where: { user: { id: userId } },
      relations: ['company'],
    });
    return new Set(
      rows
        .map((row) => row.company?.id)
        .filter((id): id is string => Boolean(id)),
    );
  }

  /**
   * Counts per filter value.
   *
   * Each dimension is counted with its own filter lifted, so ticking one
   * company still shows the others with their counts — a filter bar that
   * empties itself as soon as it is used is unusable.
   */
  private async facets(
    viewer: Viewer,
    query: JobPostingsQuery,
  ): Promise<JobPostingFacets> {
    const countBy = async (
      dimension: FilterDimension,
      column: string,
      labelColumn = column,
    ): Promise<JobPostingFacet[]> => {
      const rows = await this.buildQuery(viewer, query, [dimension])
        .select(column, 'value')
        .addSelect(labelColumn, 'label')
        .addSelect('COUNT(DISTINCT job.id)', 'count')
        .andWhere(`${column} IS NOT NULL`)
        .groupBy(column)
        .addGroupBy(labelColumn)
        .orderBy('COUNT(DISTINCT job.id)', 'DESC')
        .limit(30)
        .getRawMany<{ value: string; label: string; count: string }>();

      return rows.map((row) => ({
        value: row.value,
        label: row.label ?? row.value,
        count: Number.parseInt(row.count, 10),
      }));
    };

    /** Places live in a child table, so their facets need the join. */
    const countPlaces = async (
      dimension: 'city' | 'country',
    ): Promise<JobPostingFacet[]> => {
      const rows = await this.buildQuery(viewer, query, [dimension])
        .innerJoin(JobPostingLocation, 'place', 'place."jobPostingId" = job.id')
        .select(`place."${dimension}"`, 'value')
        .addSelect('COUNT(DISTINCT job.id)', 'count')
        .andWhere(`place."${dimension}" <> ''`)
        .groupBy(`place."${dimension}"`)
        .orderBy('COUNT(DISTINCT job.id)', 'DESC')
        .limit(40)
        .getRawMany<{ value: string; count: string }>();

      return rows.map((row) => ({
        value: row.value,
        label: row.value,
        count: Number.parseInt(row.count, 10),
      }));
    };

    const [
      companies,
      cities,
      countries,
      departments,
      employmentTypes,
      remoteTypes,
    ] = await Promise.all([
      countBy('companyId', 'job.companyId', 'company.name'),
      countPlaces('city'),
      countPlaces('country'),
      countBy('department', 'job.department'),
      countBy('employmentType', 'job.employmentType'),
      countBy('remoteType', 'job.remoteType'),
    ]);

    return {
      companies,
      cities,
      countries,
      departments,
      employmentTypes,
      remoteTypes,
    };
  }

  /**
   * A short, ranked slice of the board.
   *
   * Same filters and same ranking as {@link findMany}, without the facets or
   * the "new" count: a home page shows three offers and has no filter bar, and
   * those aggregates are the expensive half of a board query.
   */
  async highlights(
    userId: string,
    query: JobPostingsQuery,
    preloaded?: Viewer,
  ): Promise<{ data: JobPostingResponse[]; total: number }> {
    const viewer = preloaded ?? (await this.viewer(userId));
    const limit = Math.min(Math.max(toInt(query.limit) ?? 5, 1), 25);
    const match = buildMatchSql(userId, viewer);

    const qb = this.buildQuery(viewer, query, [], true)
      .addSelect('interaction.status', 'i_status')
      .addSelect('interaction.saved', 'i_saved')
      .addSelect('interaction.applicationId', 'i_application')
      .limit(limit);

    if (match) {
      qb.addSelect(match.score, 'match_score').setParameters(match.params);
    }
    this.applySort(qb, query, Boolean(match));

    // `getCount` drops the limit, so a tile can say "12 waiting" above a list
    // that only shows three.
    const [{ entities, raw }, total] = await Promise.all([
      qb.getRawAndEntities<Record<string, unknown>>(),
      qb.getCount(),
    ]);

    const [locations, followed] = await Promise.all([
      this.locationsFor(entities.map((job) => job.id)),
      this.followedCompanies(userId),
    ]);

    return {
      data: entities.map((job, index) =>
        this.toResponse(job, {
          raw: raw[index] ?? {},
          locations: locations.get(job.id) ?? [],
          followed: followed.has(job.companyId),
          preference: viewer.preference,
        }),
      ),
      total,
    };
  }

  async findOne(userId: string, id: string): Promise<JobPostingResponse> {
    const viewer = await this.viewer(userId);
    const job = await this.jobPostingRepository.findOne({
      where: { id },
      relations: ['company'],
    });
    if (!job) throw new NotFoundException('Job posting not found');

    const [interaction, locations, followed] = await Promise.all([
      this.interactionRepository.findOne({
        where: { userId, jobPostingId: id },
      }),
      this.locationRepository.find({ where: { jobPostingId: id } }),
      this.followedCompanies(userId),
    ]);

    return this.toResponse(job, {
      raw: {
        i_status: interaction?.status ?? null,
        i_saved: interaction?.saved ?? null,
        i_application: interaction?.applicationId ?? null,
      },
      locations,
      followed: followed.has(job.companyId),
      preference: viewer.preference,
    });
  }

  /**
   * Offers worth telling the user about: open, matching their profile, first
   * seen in the last week, and never opened.
   *
   * "Never opened" is the absence of an interaction row, which is why this is a
   * NOT EXISTS rather than a status compare.
   */
  async countNew(userId: string, preloaded?: Viewer): Promise<number> {
    const viewer = preloaded ?? (await this.viewer(userId));
    const since = new Date(Date.now() - NEW_WINDOW_DAYS * 86_400_000);

    const qb = this.jobPostingRepository
      .createQueryBuilder('job')
      .where('job.closedAt IS NULL')
      .andWhere('job.createdAt >= :since', { since })
      .andWhere(
        `NOT EXISTS (
           SELECT 1 FROM "job_posting_interaction" i
           WHERE i."jobPostingId" = job.id AND i."userId" = :userId
         )`,
        { userId },
      );

    const predicate = buildMatchPredicate(viewer.preference);
    if (predicate) qb.andWhere(`(${predicate.sql})`, predicate.params);

    const exclusion = buildExclusionPredicate(viewer.preference);
    if (exclusion) qb.andWhere(exclusion.sql, exclusion.params);

    return qb.getCount();
  }

  // ------------------------------------------------------------ user actions

  /**
   * Creates or updates the viewer's row for one offer.
   *
   * Every user action lands here, so the "no row means untouched" rule has
   * exactly one place that breaks it.
   */
  private async upsertInteraction(
    userId: string,
    jobPostingId: string,
    patch: Partial<JobPostingInteraction>,
  ): Promise<JobPostingInteraction> {
    const exists = await this.jobPostingRepository.findOne({
      where: { id: jobPostingId },
      select: { id: true },
    });
    if (!exists) throw new NotFoundException('Job posting not found');

    const current = await this.interactionRepository.findOne({
      where: { userId, jobPostingId },
    });

    if (current) {
      Object.assign(current, patch);
      return this.interactionRepository.save(current);
    }

    return this.interactionRepository.save(
      this.interactionRepository.create({
        userId,
        jobPostingId,
        status: JobPostingStatus.SEEN,
        ...patch,
      }),
    );
  }

  async markAs(
    userId: string,
    jobId: string,
    status: JobPostingStatus,
  ): Promise<void> {
    await this.upsertInteraction(userId, jobId, { status });
  }

  async setSaved(
    userId: string,
    jobId: string,
    saved: boolean,
  ): Promise<JobPostingResponse> {
    await this.upsertInteraction(userId, jobId, {
      saved,
      savedAt: saved ? new Date() : null,
    });
    return this.findOne(userId, jobId);
  }

  /**
   * Pushes an offer onto the user's applications board.
   *
   * The link is kept on the interaction so the board can show it as tracked,
   * and so a second click reuses the application instead of duplicating it.
   */
  async trackAsApplication(
    user: User,
    jobId: string,
    status: ApplicationStatus = ApplicationStatus.WISHLIST,
  ): Promise<{ applicationId: string; created: boolean }> {
    const job = await this.jobPostingRepository.findOne({
      where: { id: jobId },
      relations: ['company'],
    });
    if (!job) throw new NotFoundException('Job posting not found');

    const existingInteraction = await this.interactionRepository.findOne({
      where: { userId: user.id, jobPostingId: jobId },
    });

    if (existingInteraction?.applicationId) {
      const existing = await this.applicationRepository.findOne({
        where: { id: existingInteraction.applicationId },
      });
      if (existing) return { applicationId: existing.id, created: false };
    }

    const application = this.applicationRepository.create({
      position: job.title,
      company: job.company,
      url: job.url,
      salaryMin: job.salaryMin ?? undefined,
      salaryMax: job.salaryMax ?? undefined,
      status,
      notes: job.location ? `Location: ${job.location}` : undefined,
      user,
      ...(status === ApplicationStatus.APPLIED
        ? { appliedAt: new Date() }
        : {}),
    });
    const saved = await this.applicationRepository.save(application);

    await this.upsertInteraction(user.id, jobId, {
      applicationId: saved.id,
      status:
        status === ApplicationStatus.APPLIED
          ? JobPostingStatus.APPLIED
          : (existingInteraction?.status ?? JobPostingStatus.SEEN),
    });

    return { applicationId: saved.id, created: true };
  }

  private toResponse(
    job: JobPosting,
    context: {
      raw: Record<string, unknown>;
      locations: JobPostingLocation[];
      followed: boolean;
      preference: JobPreference | null;
    },
  ): JobPostingResponse {
    const score = context.raw.match_score;
    const withLocations = Object.assign(job, { locations: context.locations });

    return {
      id: job.id,
      title: job.title,
      url: job.url,
      externalId: job.externalId,
      description: job.description,
      descriptionHtml: job.descriptionHtml,
      location: job.location,
      locations: context.locations.map((location) => ({
        city: location.city || null,
        region: location.region || null,
        country: location.country || null,
        raw: location.raw,
      })),
      department: job.department,
      employmentType: job.employmentType,
      remoteType: job.remoteType,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryCurrency: job.salaryCurrency,
      source: job.source,
      postedAt: job.postedAt?.toISOString() ?? null,
      validThrough: job.validThrough?.toISOString() ?? null,
      lastSeenAt: job.lastSeenAt?.toISOString() ?? null,
      closedAt: job.closedAt?.toISOString() ?? null,
      closedReason: job.closedReason,
      companyId: job.companyId,
      companyName: job.company?.name ?? '',
      followed: context.followed,
      createdAt: job.createdAt.toISOString(),
      updatedAt: job.updatedAt.toISOString(),

      status:
        (context.raw.i_status as JobPostingStatus | null) ??
        JobPostingStatus.NEW,
      saved: Boolean(context.raw.i_saved),
      applicationId: (context.raw.i_application as string | null) ?? null,

      matchScore: typeof score === 'number' ? score : null,
      matchReasons: buildMatchReasons(
        withLocations,
        context.preference,
        context.followed,
      ),
    };
  }
}
