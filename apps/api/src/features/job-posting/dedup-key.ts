import type { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';

/** "Sr. Développeur (H/F)" → "sr developpeur h f". */
export const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * What makes two listings the same opening, for one company.
 *
 * The URL and the ATS id only settle it inside one board: the same role posted
 * on a second board, or on a board whose URL moved, carries neither. Title and
 * city are what both copies still agree on, so they are the key.
 *
 * The city comes from the parsed places rather than the display label, because
 * boards disagree on the label ("Paris, France" vs "Paris, Île-de-France") and
 * agree on the city.
 *
 * ponytail: two genuinely distinct openings with the same title in the same
 * city collapse into one. Add the seniority or the ATS id to the key if a real
 * board turns out to publish those.
 */
export const dedupKey = (dto: CreateJobPostingDto): string => {
  const city = dto.locations?.find((place) => place.city)?.city;
  const place = city ?? dto.location?.split(',')[0] ?? '';
  return `${fold(dto.title)}|${fold(place)}`;
};
