import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingLocation } from '@repo/db/entities/job-posting-location';
import { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';
import { dedupKey } from './dedup-key';
import { contentHash } from './content-hash';

export interface InsertedJobSummary {
  id: string;
  title: string;
  url: string;
  location: string | null;
}

// Below Postgres' bind-parameter cap.
const BATCH_CHUNK_SIZE = 200;

const MERGE_CHUNK_SIZE = 100;

/**
 * How alike two titles must read before they are taken for one opening.
 *
 * High on purpose. "Senior Backend Engineer" against "Sr. Backend Engineer" is
 * the case worth catching; "Backend Engineer II" against "Backend Engineer III"
 * is two openings, and merging those loses one of them for good.
 */
const TITLE_SIMILARITY = 0.9;

export interface BatchCreateResult {
  inserted: number;
  total: number;
  jobs: InsertedJobSummary[];
}

/** One incoming offer with the two things derived from it: who it is, and what it says. */
interface PreparedPosting {
  dto: CreateJobPostingDto;
  key: string;
  hash: string;
}

const asInteger = (value: number | null | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.round(value)
    : null;

@Injectable()
export class JobPostingIngestService {
  constructor(
    @InjectRepository(JobPosting)
    private readonly jobPostingRepository: Repository<JobPosting>,
    @InjectRepository(JobPostingLocation)
    private readonly locationRepository: Repository<JobPostingLocation>,
  ) {}

  async createBatch(input: CreateJobPostingDto[]): Promise<BatchCreateResult> {
    if (!input.length) return { inserted: 0, total: 0, jobs: [] };

    const dtos = input.map((dto) => ({
      ...dto,
      salaryMin: asInteger(dto.salaryMin),
      salaryMax: asInteger(dto.salaryMax),
    }));
    const seenAt = new Date();
    const prepared: PreparedPosting[] = dtos.map((dto) => ({
      dto,
      key: dedupKey(dto),
      hash: contentHash(dto),
    }));

    await this.resolveNearDuplicates(prepared);

    const jobs: InsertedJobSummary[] = [];
    for (let start = 0; start < prepared.length; start += BATCH_CHUNK_SIZE) {
      const chunk = prepared.slice(start, start + BATCH_CHUNK_SIZE);
      jobs.push(
        ...(await this.insertChunk(chunk.map((p) => this.toRow(p, seenAt)))),
      );
    }

    for (let start = 0; start < prepared.length; start += MERGE_CHUNK_SIZE) {
      const chunk = prepared.slice(start, start + MERGE_CHUNK_SIZE);
      const changed = await this.mergeChunk(chunk, seenAt);
      await this.touchChunk(chunk, seenAt);
      // Only a posting whose text actually moved can have moved its cities. For
      // an unchanged offer — nearly all of them, every cycle — this is the work
      // that does not happen.
      await this.syncLocations(chunk, changed);
    }

    return { inserted: jobs.length, total: prepared.length, jobs };
  }

  /**
   * Second pass on identity, for the copies the exact key misses.
   *
   * The key folds a title and a city; two boards that spell the same opening
   * differently still produce two keys, and the unique constraint then happily
   * stores both. Here an incoming key is rewritten to the one already on file
   * when the city matches exactly and the titles read the same — after which
   * every step below treats the pair as the one offer it is.
   *
   * The city is compared strictly rather than fuzzily: on a long title the city
   * is a small part of the string, and two cities would score alike enough to
   * merge a role in Paris into the same one in Lyon.
   *
   * ponytail: trigrams, not embeddings. pg_trgm is already installed and costs
   * nothing per offer. A title rewritten rather than reworded — another language,
   * a different job family name — is what would need embeddings; add them when
   * duplicates that survive this are actually observed.
   */
  private async resolveNearDuplicates(
    prepared: PreparedPosting[],
  ): Promise<void> {
    for (let start = 0; start < prepared.length; start += MERGE_CHUNK_SIZE) {
      const chunk = prepared.slice(start, start + MERGE_CHUNK_SIZE);
      const params: unknown[] = [];
      const tuples = chunk.map((item, index) => {
        params.push(index + start, item.dto.companyId, item.key);
        return `($${params.length - 2}::int, $${params.length - 1}::uuid, $${params.length}::text)`;
      });
      params.push(TITLE_SIMILARITY);
      const threshold = `$${params.length}::real`;

      const matches = await this.jobPostingRepository.query<
        Array<{ idx: number; existing: string }>
      >(
        `SELECT DISTINCT ON (v.idx) v.idx AS idx, jp."dedupKey" AS existing
         FROM (VALUES ${tuples.join(', ')}) AS v(idx, "companyId", "dedupKey")
         JOIN "job_posting" jp
           ON jp."companyId" = v."companyId"
          -- Coarse, index-backed prefilter on the GIN trigram index; the two
          -- conditions below are what actually decide.
          AND jp."dedupKey" % v."dedupKey"
          AND split_part(jp."dedupKey", '|', 2) = split_part(v."dedupKey", '|', 2)
          AND similarity(split_part(jp."dedupKey", '|', 1),
                         split_part(v."dedupKey", '|', 1)) >= ${threshold}
         ORDER BY v.idx,
                  similarity(split_part(jp."dedupKey", '|', 1),
                             split_part(v."dedupKey", '|', 1)) DESC,
                  jp."createdAt" ASC`,
        params,
      );

      for (const match of matches) {
        const target = prepared[match.idx];
        if (target) target.key = match.existing;
      }
    }
  }

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
   * The clause that says which stored row an incoming offer is.
   *
   * Shared by the merge and the touch so the two can never disagree about
   * identity — one of them writing the description of a row the other dated
   * would be the worst kind of bug to read back months later.
   */
  private static readonly MATCHES_INCOMING = `jp."companyId" = v."companyId"
         AND (
           jp."url" = v.url
           OR (v."externalId" IS NOT NULL AND jp."externalId" = v."externalId")
           OR jp."dedupKey" = v."dedupKey"
         )`;

  /**
   * Rewrite the offers whose text moved, and say which ones those were.
   *
   * Guarded on the digest: a board re-read every few hours is overwhelmingly
   * the same board, and rewriting eighteen columns, the tsvector and the city
   * rows to store what is already there is the cost this whole mechanism exists
   * to remove. Existing rows carry no hash yet, and `IS DISTINCT FROM` treats
   * that as a difference, so each one is merged in full exactly once.
   */
  private async mergeChunk(
    chunk: PreparedPosting[],
    seenAt: Date,
  ): Promise<Map<string, string>> {
    if (!chunk.length) return new Map();

    const params: unknown[] = [];
    const tuples = chunk.map(({ dto, key, hash }) => {
      const values = [
        dto.companyId,
        dto.url,
        key,
        hash,
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

    const changed = await this.jobPostingRepository.query<
      Array<{ id: string; incomingUrl: string }>
    >(
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
         "contentHash" = v."contentHash",
         "detailFetchedAt" = CASE
           WHEN v.description IS NOT NULL THEN ${seenAtParam}
           ELSE jp."detailFetchedAt"
         END,
         "updatedAt" = ${seenAtParam}
       FROM (VALUES ${tuples.join(', ')}) AS v(
         "companyId", url, "dedupKey", "contentHash", "externalId", title, description,
         "descriptionHtml", location, department, domain, seniority, "employmentType",
         "remoteType", "salaryMin", "salaryMax", "salaryCurrency", source, "postedAt",
         "validThrough"
       )
       WHERE ${JobPostingIngestService.MATCHES_INCOMING}
         AND jp."contentHash" IS DISTINCT FROM v."contentHash"
       RETURNING jp."id" AS id, v.url AS "incomingUrl"`,
      params,
    );

    return new Map(changed.map((row) => [row.incomingUrl, row.id]));
  }

  /**
   * Say the offer is still there — the one write every crawl must make.
   *
   * Runs for every incoming offer, changed or not: being seen is what keeps a
   * posting open, and `closedAt` is cleared because a role that came back onto
   * a board is a role that is open again.
   */
  private async touchChunk(
    chunk: PreparedPosting[],
    seenAt: Date,
  ): Promise<void> {
    if (!chunk.length) return;

    const params: unknown[] = [];
    const tuples = chunk.map(({ dto, key }) => {
      params.push(dto.companyId, dto.url, key, dto.externalId ?? null);
      return `($${params.length - 3}::uuid, $${params.length - 2}::text, $${params.length - 1}::text, $${params.length}::text)`;
    });
    params.push(seenAt);
    const seenAtParam = `$${params.length}::timestamptz`;

    await this.jobPostingRepository.query(
      `UPDATE "job_posting" AS jp SET
         "lastSeenAt" = ${seenAtParam},
         "closedAt" = NULL,
         "closedReason" = NULL
       FROM (VALUES ${tuples.join(', ')}) AS v("companyId", url, "dedupKey", "externalId")
       WHERE ${JobPostingIngestService.MATCHES_INCOMING}`,
      params,
    );
  }

  /**
   * Bring the city rows in line, for the offers that changed.
   *
   * The posting ids come from the merge's RETURNING rather than a lookup of our
   * own: the merge already matched each incoming offer to its row, by URL or ATS
   * id or key, and re-deriving that here by URL alone would miss every offer
   * matched on one of the other two.
   */
  private async syncLocations(
    chunk: PreparedPosting[],
    postingIdByUrl: Map<string, string>,
  ): Promise<void> {
    const rows: Array<[string, string, string, string, string]> = [];
    for (const { dto } of chunk) {
      if (!dto.locations?.length) continue;
      const postingId = postingIdByUrl.get(dto.url);
      if (!postingId) continue;
      for (const location of dto.locations) {
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

  /**
   * A brand-new row goes in without a digest, and the merge that runs straight
   * after fills it.
   *
   * Writing it here instead would make the merge see the row as unchanged on
   * the very first pass and skip it — and with it the city rows, which are
   * written only for offers the merge reports as moved. One writer for the
   * digest, one meaning for it.
   */
  private toRow(
    { dto, key }: PreparedPosting,
    seenAt: Date,
  ): QueryDeepPartialEntity<JobPosting> {
    return {
      title: dto.title,
      url: dto.url,
      dedupKey: key,
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
