import type { Page } from 'playwright';
import type { ScrapedJob } from '../types';
import { JOB_URL_PATTERNS } from '../url';

interface DomExtractionArgs {
  jobUrlPatterns: string[];
}

/**
 * The extractor that runs inside the page, kept as source text rather than a
 * function reference.
 *
 * Playwright serialises a function argument by calling `toString()` on it. Under
 * `tsx`/esbuild (which the dev script uses) the compiled function body contains
 * calls to esbuild's `__name` helper, and that helper only exists in the module
 * scope — never in the page — so a normal function argument throws
 * `ReferenceError: __name is not defined` at runtime. Passing the source as a
 * string sidesteps the transpiler entirely and behaves identically under `tsc`.
 *
 * Because this is a string, it is not type-checked; keep it small and defensive.
 */
const EXTRACTOR_SOURCE = String.raw`(options) => {
  const jobUrlPatterns = options.jobUrlPatterns.map(
    (source) => new RegExp(source, 'i'),
  );

  const text = (node) => (node && node.textContent ? node.textContent : '')
    .replace(/\s+/g, ' ')
    .trim();

  /** Class list reduced to its stable part: no hashes, no digits, no state. */
  const classSkeleton = (element) =>
    Array.from(element.classList)
      .map((name) => name.replace(/[0-9]+/g, '#'))
      .filter(
        (name) =>
          name.length > 1 &&
          name.length < 40 &&
          !/^(is|has|active|selected|open|hover|focus)/i.test(name),
      )
      .sort()
      .slice(0, 3)
      .join('.');

  /** Shape of an anchor's position in the tree, used to group siblings. */
  const signature = (anchor) => {
    const parts = [anchor.tagName + ':' + classSkeleton(anchor)];
    let node = anchor.parentElement;
    for (let depth = 0; depth < 4 && node; depth++) {
      parts.push(node.tagName + ':' + classSkeleton(node));
      node = node.parentElement;
    }
    return parts.join('>');
  };

  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      // Virtualised rows below the fold report zero size; fall back to style.
      const style = window.getComputedStyle(element);
      return style.display !== 'none' && style.visibility !== 'hidden';
    }
    return true;
  };

  const anchors = Array.from(document.querySelectorAll('a[href]')).filter(
    (anchor) => {
      if (!anchor.href || anchor.href.indexOf('javascript:') === 0) return false;
      if (!text(anchor) && !anchor.querySelector('h1,h2,h3,h4,h5')) return false;
      return isVisible(anchor);
    },
  );

  const groups = new Map();
  for (const anchor of anchors) {
    const key = signature(anchor);
    const bucket = groups.get(key);
    if (bucket) bucket.push(anchor);
    else groups.set(key, [anchor]);
  }

  /** The card element that wraps one listing entry. */
  const cardFor = (anchor) => {
    let node = anchor;
    for (let depth = 0; depth < 4; depth++) {
      const parent = node.parentElement;
      if (!parent) break;
      // Stop climbing once the container holds more than this one entry.
      if (parent.querySelectorAll('a[href]').length > 1) break;
      node = parent;
    }
    return node;
  };

  const META_SELECTOR =
    '[class*="location" i],[class*="city" i],[class*="office" i],[class*="place" i],[class*="region" i],[class*="country" i],[data-location],[itemprop="jobLocation"]';
  const DEPT_SELECTOR =
    '[class*="department" i],[class*="team" i],[class*="category" i],[class*="function" i],[class*="discipline" i]';

  const rowFrom = (anchor) => {
    const card = cardFor(anchor);
    const heading = anchor.querySelector('h1,h2,h3,h4,h5,h6');
    const title =
      text(heading) ||
      text(anchor.querySelector('[class*="title" i]')) ||
      text(anchor) ||
      text(card.querySelector('h1,h2,h3,h4,h5,h6'));
    if (!title) return null;

    const meta = card.querySelector(META_SELECTOR);
    const dept = card.querySelector(DEPT_SELECTOR);
    const time = card.querySelector('time[datetime]');

    let location = text(meta) || undefined;
    if (!location) {
      // Boards without semantic classes put the location in the card text
      // right after the title. That slot also holds the department on plenty of
      // boards, so only text that actually reads like a place is accepted —
      // no location beats a department stored as one.
      const remainder = text(card).replace(title, '').trim();
      const bits = remainder
        .split(/[•|·]|\s{2,}/)
        .map((part) => part.trim())
        .filter((part) => part.length > 1 && part.length < 60);
      const placeLike = bits.filter((part) =>
        /,|\bremote\b|\bhybrid\b|\bon-?site\b|\banywhere\b|\btélétravail\b/i.test(
          part,
        ),
      );
      location = placeLike[0];
    }

    return {
      title: title,
      url: anchor.href,
      location: location,
      department: text(dept) || undefined,
      postedAt: time ? time.getAttribute('datetime') || undefined : undefined,
    };
  };

  const scoreGroup = (members) => {
    const urls = new Set(members.map((anchor) => anchor.href));
    if (urls.size < 3) return 0;

    let jobUrls = 0;
    urls.forEach((url) => {
      if (jobUrlPatterns.some((pattern) => pattern.test(url))) jobUrls++;
    });

    const titles = members.map((anchor) => text(anchor));
    const distinctTitles = new Set(titles.filter(Boolean)).size;
    // Nav menus repeat the same few labels; listings do not.
    if (distinctTitles < urls.size * 0.7) return 0;

    let withMeta = 0;
    for (const anchor of members) {
      if (cardFor(anchor).querySelector(META_SELECTOR + ',time[datetime]')) {
        withMeta++;
      }
    }

    return urls.size + jobUrls * 2 + withMeta * 1.5 + (urls.size > 5 ? 3 : 0);
  };

  let bestRows = [];
  let bestScore = 0;

  groups.forEach((members) => {
    if (members.length < 3) return;
    const score = scoreGroup(members);
    if (score <= bestScore) return;

    const seen = new Set();
    const rows = [];
    for (const anchor of members) {
      if (seen.has(anchor.href)) continue;
      seen.add(anchor.href);
      const row = rowFrom(anchor);
      if (row) rows.push(row);
    }
    if (rows.length >= 3) {
      bestScore = score;
      bestRows = rows;
    }
  });

  return bestRows;
}`;

/**
 * Extracts a job listing from a rendered DOM by finding the repeated structure
 * that holds it.
 *
 * A careers listing is, structurally, N sibling cards sharing the same shape.
 * Grouping links by their ancestor "signature" and picking the largest coherent
 * group is far more reliable than matching class names against a keyword list,
 * because it does not depend on the vendor's naming at all.
 */
export const extractDomJobs = async (page: Page): Promise<ScrapedJob[]> => {
  const args: DomExtractionArgs = {
    jobUrlPatterns: JOB_URL_PATTERNS.map((pattern) => pattern.source),
  };

  // Playwright evaluates a string as an expression rather than calling it with
  // the argument, so the extractor is invoked inline with its args baked in.
  const expression = `(${EXTRACTOR_SOURCE})(${JSON.stringify(args)})`;
  const rows = await page.evaluate<ScrapedJob[] | undefined>(expression);
  return rows ?? [];
};

/**
 * Finds the "next page" link of a paginated listing.
 *
 * Returns an absolute URL, or null when the listing is single-page or scrolls
 * instead of paging.
 */
const NEXT_LINK_SOURCE = String.raw`() => {
  const asAbsolute = (anchor) =>
    anchor && anchor.href && anchor.href.indexOf('javascript:') !== 0
      ? anchor.href
      : null;

  const rel = document.querySelector('a[rel~="next"]');
  if (rel) return asAbsolute(rel);

  const linkTag = document.querySelector('link[rel~="next"][href]');
  if (linkTag) {
    try {
      return new URL(linkTag.getAttribute('href'), document.baseURI).toString();
    } catch (err) {
      return null;
    }
  }

  const labelled = document.querySelector(
    'a[aria-label*="next" i],a[aria-label*="suivant" i],a[class*="next" i][href],a[data-testid*="next" i][href]',
  );
  if (labelled) return asAbsolute(labelled);

  // Fall back to a link whose visible text is a next-page marker.
  const anchors = Array.from(document.querySelectorAll('a[href]'));
  for (const anchor of anchors) {
    const label = (anchor.textContent || '').replace(/\s+/g, ' ').trim();
    if (/^(next|next page|suivant|page suivante|weiter|siguiente|›|»|>)$/i.test(label)) {
      return asAbsolute(anchor);
    }
  }
  return null;
}`;

export const findNextPageUrl = async (page: Page): Promise<string | null> => {
  const href = await page
    .evaluate<string | null>(`(${NEXT_LINK_SOURCE})()`)
    .catch(() => null);
  return href ?? null;
};

export interface PagedDomOptions {
  /** Pages to visit in total, including the one already loaded. */
  maxPages?: number;
  /** Abort once this timestamp passes. */
  deadline?: number;
  log?: (data: Record<string, unknown>, msg: string) => void;
}

/**
 * Extracts a listing that spans several pages.
 *
 * Alphabetically-sorted boards are common, so a new posting is as likely to be
 * on page 4 as on page 1 — stopping at the first page would silently miss it.
 * Paging stops as soon as a page yields nothing new, which also handles a
 * "next" link that loops back on itself.
 */
export const extractDomJobsPaged = async (
  page: Page,
  options: PagedDomOptions = {},
): Promise<ScrapedJob[]> => {
  const maxPages = Math.max(1, options.maxPages ?? 10);
  const log = options.log ?? (() => {});

  const collected: ScrapedJob[] = [];
  const seenUrls = new Set<string>();
  const visited = new Set<string>([page.url()]);

  for (let index = 0; index < maxPages; index++) {
    const rows = await extractDomJobs(page);
    let fresh = 0;
    for (const row of rows) {
      if (!row.url || seenUrls.has(row.url)) continue;
      seenUrls.add(row.url);
      collected.push(row);
      fresh++;
    }

    if (index > 0 && fresh === 0) break;
    if (options.deadline && Date.now() >= options.deadline) {
      log(
        { pages: index + 1, jobs: collected.length },
        'Pagination cut short by time budget',
      );
      break;
    }

    const nextUrl = await findNextPageUrl(page);
    if (!nextUrl || visited.has(nextUrl)) break;

    // Bounded coverage must be visible: a silent stop reads as "that was the
    // whole listing" when it was not.
    if (index === maxPages - 1) {
      log(
        { maxPages, jobs: collected.length, nextUrl },
        'Listing has more pages than maxPages allows — remainder not scraped',
      );
      break;
    }
    visited.add(nextUrl);

    const moved = await page
      .goto(nextUrl, { waitUntil: 'domcontentloaded' })
      .then(() => true)
      .catch(() => false);
    if (!moved) break;
    await page
      .waitForLoadState('networkidle', { timeout: 6000 })
      .catch(() => undefined);
    log({ url: nextUrl, page: index + 2 }, 'Following listing pagination');
  }

  return collected;
};
