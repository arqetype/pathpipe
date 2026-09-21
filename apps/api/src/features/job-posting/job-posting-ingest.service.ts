import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingLocation } from '@repo/db/entities/job-posting-location';
import { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';
import { dedupKey } from './dedup-key';

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

export interface BatchCreateResult {
  inserted: number;
  total: number;
  /**
   * The rows that were actually new. Alert digests are built from this, so they
   * can never claim an offer that has been on the board for weeks.
   */
  jobs: InsertedJobSummary[];
}

/** Writing what the crawler found, in bulk. */
@Injectable()
export class JobPostingIngestService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly jobPostingRepository: Repository<JobPosting>,
    @InjectRepository(JobPostingLocation)
    private readonly locationRepository: Repository<JobPostingLocation>,
  ) {}

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
        dedupKey(dto),
        dto.externalId ?? null,
        dto.title,
        dto.description ?? null,
        dto.descriptionHtml ?? null,
        dto.location ?? null,
        dto.department ?? null,
        dto.domain ?? null,
        dto.seniority ?? null,
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
        'text',
        'work_domain_enum',
        'seniority_level_enum',
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
         "domain" = COALESCE(v.domain, jp."domain"),
         "seniority" = COALESCE(v.seniority, jp."seniority"),
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
         "companyId", url, "dedupKey", "externalId", title, description, "descriptionHtml",
         location, department, domain, seniority, "employmentType", "remoteType", "salaryMin",
         "salaryMax", "salaryCurrency", source, "postedAt", "validThrough"
       )
       WHERE jp."companyId" = v."companyId"
         AND (
           jp."url" = v.url
           OR (v."externalId" IS NOT NULL AND jp."externalId" = v."externalId")
           OR jp."dedupKey" = v."dedupKey"
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
      dedupKey: dedupKey(dto),
      externalId: dto.externalId ?? null,
      description: dto.description ?? null,
      descriptionHtml: dto.descriptionHtml ?? null,
      location: dto.location ?? null,
      department: dto.department ?? null,
      domain: dto.domain ?? null,
      seniority: dto.seniority ?? null,
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
}
