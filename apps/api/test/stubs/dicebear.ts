/**
 * `@dicebear/*` ships ESM only and jest here runs CommonJS.
 *
 * It generates the default avatar on sign-up and nothing in this suite looks
 * at one, so it is stubbed rather than transformed — the alternative is
 * transpiling the whole package tree on every run.
 */
export const dylan = {};

export const createAvatar = () => ({
  toDataUri: () => 'data:image/svg+xml;utf8,<svg/>',
  toString: () => '<svg/>',
});
