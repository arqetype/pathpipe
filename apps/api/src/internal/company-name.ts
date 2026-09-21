/**
 * A board token, made fit to read.
 *
 * Discovery names a company after the token its ATS answers to — `nvidia`,
 * `sierra-space` — because that is the only name a board reliably gives. It is
 * a slug, and a slug is not how anybody writes a company down.
 *
 * Only the first letter is touched, and only when the name is all lowercase.
 * Anything carrying a capital already spells itself that way on purpose:
 * "NVIDIA" is not a slug waiting to be fixed, and title-casing "eBay" into
 * "EBay" would be a worse name than the one we started with.
 */
export const capitalize = (name: string): string =>
  name.charAt(0).toUpperCase() + name.slice(1);

/** True for a name that still reads as the slug it came from. */
export const isSlugCased = (name: string): boolean =>
  name === name.toLowerCase();
