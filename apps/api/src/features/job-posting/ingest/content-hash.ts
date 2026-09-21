import { createHash } from 'node:crypto';
import type { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';

/**
 * A digest of everything a re-read of the same posting could change.
 *
 * Exactly the fields the ingest merge writes, and nothing else: `url` and
 * `companyId` identify the row rather than describe it, so folding them in
 * would only make the hash differ for reasons that never reach a column.
 *
 * The direction of the error matters more than the rate. An incoming field that
 * turns null does move the hash although the merge would COALESCE it away —
 * that costs one pointless write. The reverse, a changed field leaving the hash
 * alone, would lose an edit, and nothing here can do that.
 */
const NUL = '\u0000';

export const contentHash = (dto: CreateJobPostingDto): string => {
  // Boards reorder the city list between reads; the set is what matters.
  const places = (dto.locations ?? [])
    .map((place) =>
      [place.city, place.region, place.country, place.raw]
        .map((value) => value ?? '')
        .join('~'),
    )
    .sort();

  const parts: Array<string | number | null | undefined> = [
    dto.title,
    dto.externalId,
    dto.description,
    dto.descriptionHtml,
    dto.location,
    dto.department,
    dto.domain,
    dto.seniority,
    dto.employmentType,
    dto.remoteType,
    dto.salaryMin,
    dto.salaryMax,
    dto.salaryCurrency,
    dto.source,
    dto.postedAt,
    dto.validThrough,
    ...places,
  ];

  return createHash('sha256')
    .update(parts.map((value) => String(value ?? '')).join(NUL))
    .digest('hex');
};
