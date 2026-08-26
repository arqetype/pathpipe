# Job discovery

Finds the open positions behind a watched company's careers URL, and reports
which of them are new since the last run.

This is the MVP: every strategy and adapter here has been confirmed against a
live site. Nothing speculative is kept — see [Removed](#removed-and-why).

## The ladder

`pipeline.ts` walks four rungs, cheapest and most exact first, and stops at the
first one that yields a credible listing.

| # | Rung | How it works | Cost |
|---|------|--------------|------|
| 1 | `ats-api` (by URL) | The URL names a known ATS, so we call that vendor's public JSON API | 1 request, no browser |
| 2 | `ats-api` (by page) | A company page embeds a vendor board (iframe/script); the vendor is read out of the HTML, then rung 1 applies | 2 requests, no browser |
| 3 | `embedded-state` | The listing is in the state blob a server-rendered SPA leaves in its HTML (`__NEXT_DATA__`, Nuxt, Remix, Apollo…) | 1 request, no browser |
| 4 | `dom-repeat` | The listing is read off the DOM by finding the repeated card structure, following pagination | Chromium |

Rung 4 runs twice if needed: first over the HTML we already fetched (a real DOM,
no navigation), then — only if that finds nothing — over a live render, which
covers boards that build their list client-side.

### Why structure, not class names

Rung 4 does not look for `class="job-card"`. It groups every anchor by the shape
of its ancestor chain and picks the largest coherent group, scoring on distinct
titles, job-shaped URLs and the presence of location/date metadata. A careers
listing is structurally N sibling cards of identical shape, and that holds
regardless of the vendor's naming — which is what makes it work on sites nobody
wrote an adapter for.

## Detecting "new"

A posting's identity is its ATS id when the platform exposes one, else its
normalised URL (`url.ts` strips tracking parameters, so the same job never looks
new twice). `job_source` stores a `contentHash` over the sorted job keys, plus
the ETag/Last-Modified of the page.

That gives three ways to skip work, in order:

1. a `304 Not Modified` on the conditional GET — nothing was fetched;
2. an identical `contentHash` — nothing is written or emailed;
3. on the frequent poll, adapters are called in `light` mode (no descriptions —
   often megabytes less) and the full payload is fetched only once the cheap
   answer proves the job set changed.

Insertion is one `INSERT … ON CONFLICT DO NOTHING … RETURNING`, so the rows
returned *are* the new ones. Alert emails are built from that list, never from
"the first N of the listing".

## Scheduling

Two crons, both in `ats.worker.ts`:

- **fast** (`*/15 * * * *`) — conditional GETs and light ATS calls, no browser.
  Sources that can only be read with Chromium are skipped.
- **full** (`0 */4 * * *`) — the whole ladder.

Per source: exponential backoff after repeated failures, and a periodic
re-sync (`reconcileIntervalHours`) so a posting lost to a failed insert cannot
stay missing forever. Per cycle: one shared Chromium, a concurrency cap, a
per-host request delay, and a wall-clock budget per source so one slow site
cannot stall the run.

`robots.txt` is honoured for company sites. It is deliberately **not** applied to
vendor board APIs (`respectRobotsForAts`, default off): SmartRecruiters serves
`Disallow: /` on the API host that its own embed widget calls from the visitor's
browser, so enforcing it there would disable the adapter tier without protecting
anything.

## Adapters

Verified: `greenhouse`, `lever`, `ashby`, `smartrecruiters`, `workday`.

To add one, implement `AtsAdapter` (`types.ts`) — `match(url)`, optionally
`detectInHtml(html)`, and `fetch(target, ctx)` returning `ScrapedJob[]` — then
register it in `registry.ts`. Honour `ctx.light` if the API can omit
descriptions. Confirm it against a live board with the probe before landing it.

## Probing a source

```
pnpm --filter worker probe https://example.com/careers
pnpm --filter worker probe https://example.com/careers --fast --verbose
pnpm --filter worker probe https://example.com/careers --json
```

Prints the platform, the rung that produced the listing, whether Chromium was
needed, the job count and the content hash. When a watched company reports "no
jobs found", this says which rung to fix.

Chromium must be installed for the DOM rungs: `pnpm exec playwright install
chromium`. Without it the worker logs an error and falls back to the
HTTP-only rungs.

## Removed, and why

Built, tested against real sites, and deleted because they never produced a
listing the rungs above had not already found: JSON-LD `JobPosting` markup,
RSS/Atom/JSON job feeds, sitemap crawling, and capturing the page's own XHR
responses during a render. Adapters for Workable, Personio, Recruitee, BambooHR,
Teamtailor, Comeet, Breezy, Rippling, Pinpoint and Jobvite were removed for the
same reason — no live board was found to confirm them.

They are worth reconsidering one at a time, driven by a real source that needs
one, rather than kept on spec.

## Known limitations

- **Index-normalised payloads lose their location.** Stripe's state blob stores
  jobs as `{title, slug, locationIndices: [95]}` with the place names in a
  separate sibling array, so rung 3 returns 506 correct titles and URLs with no
  location. Titles, URLs and change detection are unaffected. Dereferencing
  sibling arrays generically is deliberately not implemented on a single
  confirmed instance.
- **Pagination is capped** at `maxListingPages` (10). A board with more pages
  than that is truncated, and the cap is logged.
- **Sites that actively block bots** (Tesla returned 403) are not worked around.

## Gotchas

- **Never pass a function to `page.evaluate`.** Under `tsx` (which `dev:ats`
  uses) esbuild rewrites the function body to call its `__name` helper, which
  does not exist in the page — it throws `ReferenceError: __name is not
  defined`. Pass a self-invoking source string instead, as `dom.ts` and
  `browser.ts` do.
- **An over-cap HTTP body is discarded, not truncated.** Half a JSON document
  parses as nothing; a silent half-document would look like an empty board
  instead of a failure worth logging.
- **Locations from rung 4 are only accepted when the text reads like a place.**
  The slot next to the title holds the department on plenty of boards, and no
  location beats a department stored as one.
