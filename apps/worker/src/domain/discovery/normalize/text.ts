import { decodeEntities } from '@repo/db/parsing/sanitize';

export const stripHtml = (value: string): string =>
  decodeEntities(
    value
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|tr|h[1-6])>/gi, '\n')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[ \t ]+/g, ' ')
    // Block tags leave stray leading spaces.
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

export const foldAccents = (value: string): string =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
