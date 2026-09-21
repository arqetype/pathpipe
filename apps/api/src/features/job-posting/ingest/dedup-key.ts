import type { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';

export const fold = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// ponytail: same title+city collapses.
export const dedupKey = (dto: CreateJobPostingDto): string => {
  const city = dto.locations?.find((place) => place.city)?.city;
  const place = city ?? dto.location?.split(',')[0] ?? '';
  return `${fold(dto.title)}|${fold(place)}`;
};
