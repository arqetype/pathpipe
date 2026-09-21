# Provider data terms

**Written 2026-09-16.** Terms change without notice; every quote below was read
live on that date. Re-check before launch and at least twice a year.

**This is not legal advice.** It is a record of what each provider publishes,
quoted, with the URL. Where a clause needs a lawyer's reading, it says so.

## Scope

The endpoints this project actually calls, read from the code, not from memory:

| Where | Endpoint |
| --- | --- |
| `vendors.ts:52`, `adapters/ashby.ts:50` | `https://api.ashbyhq.com/posting-api/job-board/{token}?includeCompensation=true` |
| `vendors.ts:59`, `adapters/greenhouse.ts:51` | `https://boards-api.greenhouse.io/v1/boards/{token}/jobs?content=true` |
| `vendors.ts:66`, `adapters/lever.ts:63` | `https://api.lever.co/v0/postings/{token}?mode=json` (also `api.eu.lever.co`) |
| `vendors.ts:74`, `adapters/teamtailor.ts:72` | `https://{token}.teamtailor.com/jobs.json?page=N` |
| `vendors.ts:81`, `adapters/smartrecruiters.ts:51` | `https://api.smartrecruiters.com/v1/companies/{token}/postings?limit=&offset=` |
| `vendors.ts:97`, `adapters/personio.ts:152` | `https://{tenant}.jobs.personio.de/xml` |
| `adapters/workday.ts:55` | `https://{tenant}.wd{N}.myworkdayjobs.com/wday/cxs/{tenant}/{site}/jobs` |
| `seed.ts:156` | `https://himalayas.app/jobs/api?limit=100&cursor=…` |
| `seed.ts:163` | `https://www.arbeitnow.com/api/job-board-api?page=N` |
| `seed.ts:170` | `https://remoteok.com/api` |
| `seed.ts:177` | `https://jobicy.com/api/v2/remote-jobs?count=50` |
| `seed.ts:90` | `https://api.ycombinator.com/v0.1/companies?page=N` |

Two facts about how they are called, because both bear on whether the use is
acceptable:

- **User-Agent** (`apps/worker/src/infrastructure/config/config.service.ts:38`):
  `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Safari/537.36 PathpipeBot/1.0 (+https://pathpipe.clementomnes.dev/bot)`.
  It identifies the bot, but prefixed with a full Chrome impersonation string.
- **robots.txt is bypassed on every call listed above.** `skipRobots: true` is
  passed by the vendor probe (`vendors.ts:121,128`), by the seed feeds and the YC
  directory (`seed.ts:91,203`), and by the ATS adapters unless
  `WORKERS_SCRAPE_ROBOTS_FOR_ATS=true` (`pipeline.ts:51-58`, default off). The
  robots parser in `http.ts` is therefore dead code on these paths.
- **Rate control** (`http.ts`): one request in flight per registrable domain,
  800 ms default gap (200 ms in the seeder, `seed.ts:235`), Personio 3 s and
  Teamtailor 1.5 s (`http.ts:57-61`), `Retry-After` honoured, per-cycle budget,
  and hosts dropped after repeated 429s. This is a genuinely conservative client.

Status key: **(a)** explicitly permitted · **(b)** permitted with conditions ·
**(c)** silent/unclear · **(d)** explicitly restricted.

## Summary

| Provider | Endpoint | Documented? | Status | Conditions | Source |
| --- | --- | --- | --- | --- | --- |
| Greenhouse | `boards-api/v1/boards/{t}/jobs` | Yes, public | (a) retrieval / (c) redistribution | No stated attribution or rate limit | [docs.greenhouse.io/job-board.html](https://docs.greenhouse.io/job-board.html) |
| Lever | `api.lever.co/v0/postings/{t}` | Yes, public | (a) retrieval / (c) redistribution | Docs anticipate third-party scraping | [lever/postings-api](https://github.com/lever/postings-api/blob/master/README.md) |
| Ashby | `posting-api/job-board/{t}` | Yes, auth not shown | (c) | Nothing stated either way | [developers.ashbyhq.com](https://developers.ashbyhq.com/docs/public-job-posting-api) |
| SmartRecruiters | `v1/companies/{t}/postings` | Yes, "Without Authentication" | **(d)** | SAP API Policy bans scraping/harvesting; 10 req/s, 8 concurrent; `robots.txt` = `Disallow: /` | [SAP API Policy](https://help.sap.com/doc/sap-api-policy/latest/en-US/API_Policy_latest.pdf) |
| Teamtailor | `{t}.teamtailor.com/jobs.json` | **No** — undocumented | (c) | Sanctioned route is a per-partner XML feed by contract | [partner.teamtailor.com/job_boards](https://partner.teamtailor.com/job_boards/) |
| Personio | `{t}.jobs.personio.de/xml` | Yes, documented feature | (c) | No consumption rules published | [developer.personio.de](https://developer.personio.de/docs/retrieving-open-job-positions) |
| Workday | `/wday/cxs/{t}/{site}/jobs` | **No** — internal SPA endpoint | (c)/(d) borderline | Site Terms ban robots and scraping; scope over `myworkdayjobs.com` unconfirmed | [workday.com site-terms](https://www.workday.com/en-us/legal/site-terms.html) |
| Himalayas | `himalayas.app/jobs/api` | Yes | (b) + conflict | Link back + credit; max `limit=20`; site ToS bans scraping | [himalayas.app/api](https://himalayas.app/api) |
| Arbeitnow | `/api/job-board-api` | Yes | (b) | "link back to Arbeitnow.com on your platform" | [arbeitnow.com/terms](https://www.arbeitnow.com/terms) |
| Remote OK | `remoteok.com/api` | Yes, in the payload | (b) | Followed (non-nofollow) link back + name credit, or access suspended | live `/api`, [remoteok.com/legal](https://remoteok.com/legal) |
| Jobicy | `/api/v2/remote-jobs` | Yes | (b) | Credit + link, apply buttons to the original job URL, poll ≤ 1×/hour | [Jobicy/remote-jobs-api](https://github.com/Jobicy/remote-jobs-api) |
| Y Combinator | `api.ycombinator.com/v0.1/companies` | **No** | **(d)** | ToS bans scraping and commercial use; `robots.txt` = `Disallow: /` | [ycombinator.com/legal](https://www.ycombinator.com/legal) |

---

## Greenhouse — (a) for retrieval, (c) for redistribution

**Public and documented.** "Job Board data is publicly available, so
authentication is not required for any GET endpoints."
— <https://docs.greenhouse.io/job-board.html>

Plain reading: fetching this endpoint without a key is the intended use.

Nothing on that page restricts storage, redistribution or commercial use — no
occurrence of "redistribute", "commercial" or "scrape". The only usage clause
found anywhere is in the Master Subscription Agreement, which binds Greenhouse's
own paying customer (the employer), not us: "Customer agrees not to use or
access, nor to enable a third party to use or access on its behalf, Greenhouse's
API in a manner that is excessive, abusive, or negatively impacts, degrades, or
impairs the Greenhouse API's or platform's availability"
— <https://www.greenhouse.com/master-subscription-agreement>

**Attribution:** none stated. **Rate limit:** none published for this endpoint
(the documented 50-per-10-seconds figure is the *Harvest* API, a different,
authenticated product — do not treat it as applicable).

**Whose data:** the employer's. The MSA has the customer warrant "it either owns
the Customer Data or is otherwise permitted to grant the license", while
Greenhouse "retains all right, title and interest … in and to the Greenhouse
Services and Performance and Usage Data". So Greenhouse is a conduit for the
employer's postings, not the owner of them.

`robots.txt` for `boards-api.greenhouse.io` is `User-agent: * / Disallow: /embed/`
— the jobs path is not disallowed.

## Lever — (a) for retrieval, (c) for redistribution

**Public and documented**, and unusually explicit about third parties: "Note
that all job postings in the `published` state are publicly viewable. These jobs
may be scraped by third parties."
— <https://github.com/lever/postings-api/blob/master/README.md>

Plain reading: Lever tells its customers to expect this traffic. That is an
acknowledgement, not a licence grant — it does not itself say we may
*redistribute* the content, and a lawyer would be needed to say whether it
amounts to implied consent.

**Attribution:** none stated. **Rate limit:** the only published figure is for
the *application submission* POST — "Lever will return a `429` status code … if
your custom job site issues more than 2 application POST requests per second"
— same URL. No GET limit is published.

**Whose data:** "Customer retains all rights, title and interest in its Customer
Data, and this Agreement does not grant Lever any rights to Customer Data"
— <https://www.lever.co/legal/terms-of-service> §4.2.

`api.lever.co/robots.txt` is `Allow: /` with `Crawl-delay: 1`. Our 800 ms default
gap is marginally faster than that; the seeder's 200 ms is five times faster.

## Ashby — (c) silent

**Documented, but the docs never say authentication is not required.** "This API
allows you to get data for all currently published Job Postings for your
organization. If you host your own careers page, you can use this data to
populate it."
— <https://developers.ashbyhq.com/docs/public-job-posting-api>

The example is a bare `curl` with no auth header, so the endpoint is public in
practice. Note the stated purpose is *your* organisation populating *its own*
careers page — nothing addresses a third party reading many organisations'
boards.

Ashby's customer terms restrict the *customer*, not us: "Customer shall not: …
access the Service in order to build a competitive product or service"
— <https://www.ashbyhq.com/resources/terms> §5.1. That clause is about the Ashby
platform and binds Ashby's own customers. **Whether a job-aggregation product
built on the posting API is "a competitive product or service" is exactly the
kind of question to put to a lawyer** — but as written it does not attach to us.

**Attribution:** none found. **Rate limit:** none published for this endpoint.
Third-party sites quote "1000 requests per minute"; that figure could not be
verified on any Ashby page and should not be relied on.

**Whose data:** the employer's — the customer grants Ashby a licence to Customer
Data and warrants it owns it (§4.1); Ashby owns only "Service Usage Data" (§4.8).

`api.ashbyhq.com/robots.txt` answers `Unauthorized` — no robots policy published.

## SmartRecruiters — (d) explicitly restricted

**Documented and explicitly public**: "**Without Authentication** – Available
only to specific endpoints which contain publicly available data: [Posting API]"
— <https://developers.smartrecruiters.com/docs/customer-overview>

But the developer platform incorporates SAP's API Policy by reference: "any use
of SmartRecruiters APIs is governed by the SAP API Policy"
— <https://developers.smartrecruiters.com/docs/the-smartrecruiters-platform>

And that policy states: "SAP prohibits API use for: (a) interaction or
integration with (semi-) autonomous or generative AI systems that plan, select,
or execute sequences of API calls, and (b) scraping, harvesting, or systematic
and/or large-scale data extraction or replication."
— <https://help.sap.com/doc/sap-api-policy/latest/en-US/API_Policy_latest.pdf> §2.2.2

Plain reading: the endpoint is open, and the governing policy forbids exactly
what a seeder that probes thousands of tokens and a crawler that pages every
board do. The documented use is one company populating its own site.

**Rate limit, explicit:** "For most endpoints, SmartAPIs allow up to 10 requests
per second … up to 8 concurrent requests."
— <https://developers.smartrecruiters.com/docs/rate-limiting>. We are well inside
this; the problem here is the permission, not the pace.

**`robots.txt` is the clearest signal of all** — `https://api.smartrecruiters.com/robots.txt`,
fetched live 2026-09-16:

```
User-agent: LinkedInBot
Allow: /v1/companies/
User-agent: *
Disallow: /
```

Every crawler but LinkedIn's is disallowed from the entire host, and
`/v1/companies/` — our exact path — is allowed by name to LinkedIn only. Our code
passes `skipRobots: true` on this call.

**Whose data:** reported as "Customer retains all right, title, and ownership of
the Customer Content" in SmartRecruiters' terms; the researching agent could not
re-verify that exact string from raw HTML, so treat the wording as unconfirmed
while the direction (employer owns it) matches every other vendor.

## Teamtailor — (c) silent, and the endpoint is undocumented

**Undocumented.** Teamtailor's published API is the authenticated Partner API at
`api.teamtailor.com`; `jobs.json` appears nowhere in its docs
(<https://docs.teamtailor.com/>). The sanctioned route for a job board is a
private feed issued per partner: "Teamtailor generates a unique XML feed for a
single job board containing all job ads from customers who activated the
integration … The job board will receive a unique url to the XML feed. … contact
us at techpartnerships@teamtailor.com"
— <https://partner.teamtailor.com/job_boards/>

Plain reading: a documented, contractual path exists for what this project does,
and we are not on it. `jobs.json` is the career site's own widget feed.

Teamtailor's Terms (<https://www.teamtailor.com/en/terms-and-conditions/>,
updated 2026-05-02) contain no "scrape", "robots", "crawl" or "bot" language at
all — they govern the contract with the employer. **Silence, not permission.**

**Attribution / rate limit:** none stated. **Whose data:** customer content
"will remain your property" per §10 — the employer's.

`robots.txt` on a career site does not disallow `/jobs.json`, but carries
`Content-Signal: search=no, ai-train=no, ai-input=no` (fetched from
`polestar.teamtailor.com`, one of the boards this project verified against). That
signal targets AI training and search indexing rather than job aggregation, but
it is the operator saying "not for machine consumption" in the one machine-
readable place they have.

## Personio — (c) silent

**Documented as a feature.** "Current open job postings can be retrieved in XML
format under myaccount.jobs.personio.de/xml."
— <https://developer.personio.de/docs/retrieving-open-job-positions>

The page documents the schema and nothing else: no statement of who may fetch it
or what may be done with the result. Personio's General Terms & Conditions
(Version 01-2023 PDF, linked from <https://www.personio.com/terms/>) are a B2B
SaaS contract with the employer and contain no scraping, robots or automated-
access clause of any kind.

**No published terms found for third-party consumption of this feed.** Checked:
the developer docs page above, `developer.personio.de/docs/tos-api-security-1`
(a gateway page for keyed Recruiting API partners), the GTC PDF, and
`personio.com/terms` and `/legal-notice` (both answered HTTP 429 to automated
fetches — a signal in itself). Newer tenant career sites serve no `robots.txt`.

**Attribution / rate limit:** none stated. Our client already throttles Personio
to 3 s between requests because it answered 429 in testing (`http.ts:58`).

## Workday — (c)/(d) borderline, and undocumented

**Undocumented / internal.** `/wday/cxs/…` is the JSON endpoint behind the
candidate-experience single-page app. No page on `docs.workday.com` or
`community.workday.com` documents it; every description of it traces to
third-party reverse engineering.

Workday's site terms say, verbatim: "Use any data mining, robots or similar data
gathering or extraction methods designed to scrape or extract data from our
Sites"; "Develop or use any applications that interact with our Sites without our
prior written consent"; "Bypass or ignore instructions contained in our
robots.txt file"; "Sell, resell or commercially use our Sites except where
expressly permitted."
— <https://www.workday.com/en-us/legal/site-terms.html> §2

**The load-bearing uncertainty:** that document defines "Sites" as workday.com,
pages "that directly reference these Terms", the Community and the Workday APIs.
`*.myworkdayjobs.com` tenant career sites are **not** listed by name. Whether
those terms attach to a tenant's career site depends on whether its footer links
to them — unverifiable by plain fetch, since the page is client-rendered. **This
is the single clearest "ask a lawyer" item in this document**, because the
prohibition is unambiguous in intent and the only question is reach.

`robots.txt` on the tenants this project seeds does *not* disallow `/wday/cxs/`:
`nvidia.wd5.myworkdayjobs.com/robots.txt` is `Allow: /NVIDIAExternalCareerSite/`,
`Disallow: /talentcommunity/`, `Disallow: /refreshFacet/`. Salesforce's is the
same shape. So the machine-readable signal permits the career-site path while the
prose terms forbid robots — they point opposite ways.

**Whose data:** the postings are entered by the employer, but Workday's terms
claim ownership of "the Sites" generally and say nothing specific about
customer-entered recruiting data. Unclear.

## Himalayas — (b), with an unresolved conflict in their own documents

**Documented**, and the docs state the condition plainly: "Anyone can use the
interface, but please link back to the URL found on Himalayas AND mention
Himalayas as the original source. Please do not submit Himalayas jobs to
third-party websites, including but not limited to Jooble, Neuvoo, Google Jobs,
or LinkedIn Jobs."
— <https://himalayas.app/api>

And: "If you display Himalayas job data on your own website or application,
include a visible link back to himalayas.app and mention that the data is sourced
from Himalayas."
— <https://himalayas.app/docs/remote-jobs-api>

**Rate limit:** "The API is rate limited … The data is cached and refreshed every
24 hours, so there is no benefit to polling more frequently than once per day."
Same page: "limit … Defaults to 20. **Maximum value is 20.**" — our call asks for
`limit=100` (`seed.ts:156`), over the documented maximum.

**The conflict:** the site-wide terms say "You may not use data mining, robots,
screen scraping, or similar automated data gathering, extraction or publication
tools on this Site … without Himalayas' prior written approval"
— <https://himalayas.app/terms> §30. Nothing on either page reconciles that with
the API page's open invitation. **Do not read the API page as an override
without asking them**; the safe reading is that the API terms govern the API and
the ToS governs the website, but that is a reading, not a stated rule.

## Arbeitnow — (b)

**Documented**, with a one-sentence condition: "You also agree to providing a
link back to Arbeitnow.com on your platform. We may revoke the permission to use
API at any time."
— <https://www.arbeitnow.com/terms> §11

**Rate limit:** none published. **Commercial use:** §11 is silent; a separate
general clause grants permission to download materials "for personal,
non-commercial transitory viewing only" and is not cross-referenced to §11.
Whether that general clause reaches API data is unclear — flag for a lawyer if
Arbeitnow data ever reaches users.

**Whose data:** Arbeitnow is itself an aggregator — "mostly from Applicant
Tracking Systems (ATS) such as Greenhouse, SmartRecruiters, Join.com, Team
Tailor, Recruitee, Comeet"
(<https://www.arbeitnow.com/blog/job-board-api>) — so its own rights in the
content are derivative. Two layers of permission, not one.

## Remote OK — (b), condition shipped inside the payload

The terms are the **first element of the API response itself** (fetched live
2026-09-16 from `https://remoteok.com/api`):

> "API Terms of Service: Please link back (with follow, and without nofollow!) to
> the URL on Remote OK and mention Remote OK as a source, so we get traffic back
> from your site. If you do not we'll have to suspend API access.
>
> Please don't use the Remote OK logo without written permission as it's a
> registered trademark, please DO use our name Remote OK though."

Reinforced on the website: "You agree to link back with a web hyperlink or in-app
hyperlink to our site on the page or app screen where you use the data from our
APIs or site." — <https://remoteok.com/legal>

Plain reading: using this API at all obliges a followed (`rel` without `nofollow`)
link to the Remote OK URL and a visible "Remote OK" credit wherever the data
appears. The stated penalty is suspension of access. `remoteok.com/terms` is a
404; `/legal` is the operative page.

**Rate limit:** none numeric; `robots.txt` sets `Crawl-delay: 1` for the site.

**Whose data:** Remote OK's own board — "Copyright in Remote OK's websites, apps,
communities and its properties rests with Remote OK unless otherwise stated."

## Jobicy — (b), the clearest terms of the eleven

The payload carries `"documentationUrl": "https://jobi.cy/apidocs"` and, live on
2026-09-16: `"friendlyNotice": "Thanks for using Jobicy API! Please ensure Jobicy
is clearly credited with a direct link to the source, and all application buttons
redirect to the original job URL provided in this feed."`

`jobi.cy/apidocs` sits behind a Cloudflare challenge; the same terms are
published in full by Jobicy's own verified GitHub org
(<https://github.com/Jobicy/remote-jobs-api>), which states under Fair Use:

> "1. You may use Jobicy listings in your own products and user experiences
> without requesting individual permission. 2. Keep Jobicy as the original source
> and preserve the canonical Jobicy job URL when displaying a listing. … 4. Do
> not present Jobicy listings as your own original job postings or remove source
> attribution. 5. Cache responses where appropriate and do not run automated
> polling more frequently than once per hour. … Contact Jobicy for high-volume
> commercial partnerships or custom data arrangements."

Plain reading: ordinary product use, including commercial, is pre-authorised;
attribution, the canonical Jobicy URL on apply buttons, and a one-hour polling
floor are hard conditions. Also: "The MIT License applies to the repository code
and examples. It does not transfer ownership of Jobicy job listings, employer
content, logos, or other third-party data."

Our `count=50` is inside the documented 1–200 range, and the seed cron runs daily
— well under once per hour.

## Y Combinator directory — (d) explicitly restricted

**Undocumented.** `api.ycombinator.com/v0.1/companies` is not published,
described or acknowledged in any YC material found; it is the backend of the
public company-directory UI.

YC's Terms of Use: "In connection with your use of the Site you will not engage
in or use any data mining, robots, scraping or similar data gathering or
extraction methods. If you are blocked by Y Combinator from accessing the Site
(including by blocking your IP address), you agree not to implement any measures
to circumvent such blocking" and "you agree not to display, distribute, license,
… exploit, transfer or upload for any commercial purposes, any portion of the
Site."
— <https://www.ycombinator.com/legal>

And the machine-readable signal, fetched live 2026-09-16:

```
$ curl https://api.ycombinator.com/robots.txt
User-Agent: *
Disallow: /
```

`www.ycombinator.com/robots.txt` also carries `Disallow: /companies?*`.

Plain reading: the whole API host is closed to robots, the prose bans scraping
and commercial use of site content, and the endpoint is undocumented. Our code
calls it with `skipRobots: true` (`seed.ts:91`). Of the eleven, this is the one
with the least room for interpretation.

---

## What this project would have to change

Concrete obligations that are unmet today, hardest first.

### 1. Stop calling three endpoints, or get permission

- **Y Combinator** (`seed.ts:90`). `Disallow: /` on the API host, an undocumented
  endpoint, and a ToS that bans both scraping and commercial use. There is no
  reading of these three together that supports a product with users. Removing
  `--yc` costs one option in `SeedBoardsOptions`; the feeds and the verified file
  already do the same job.
- **SmartRecruiters** (`vendors.ts:81`, `adapters/smartrecruiters.ts:51`).
  `Disallow: /` for everyone but LinkedIn, plus an incorporated policy that names
  "scraping, harvesting, or systematic and/or large-scale data extraction" as
  prohibited. The endpoint being unauthenticated is not permission. This one is
  worth a written request to SmartRecruiters before shipping, not a unilateral
  reading.
- **Workday** (`adapters/workday.ts:55`). Undocumented internal endpoint plus a
  terms document that bans robots in so many words. The only thing keeping it out
  of the "stop" column is that the terms' definition of "Sites" may not reach
  `myworkdayjobs.com`. That question needs a lawyer *before* the ~5.7k Workday
  roles are shown to paying users, not after.

### 2. Honour robots.txt instead of bypassing it

Every listed call passes `skipRobots: true`, and ATS adapter calls bypass robots
by default (`pipeline.ts:51-58`, `WORKERS_SCRAPE_ROBOTS_FOR_ATS` defaults off).
Two of the hosts we call say `Disallow: /`. Workday's own terms make ignoring
robots.txt a named prohibition. Flipping the default to on, and letting the
existing parser do its job, is a small change that removes the worst-looking fact
about this crawler — and it would have surfaced both problems in §1 automatically.

Related: the User-Agent
(`config.service.ts:38`) opens with a full Chrome impersonation string before
naming `PathpipeBot`. A bot that identifies itself as Chrome is hard to defend as
good faith. Drop the Mozilla prefix; keep `PathpipeBot/1.0 (+url)`.

### 3. Add the attribution the feeds require

Today the feeds are read only for company *names* (`seed.ts:158-178`) and nothing
from them reaches the UI, which is why nothing is currently displayed — but the
Remote OK notice conditions **API access itself**, not display: "If you do not
we'll have to suspend API access." Either:

- add a visible credit page listing Remote OK (with a followed link, no
  `nofollow`), Himalayas, Arbeitnow and Jobicy as data sources, or
- drop the feeds and seed only from `boards/verified.txt` and known companies.

The second is one line and costs the least. If any feed content ever does reach
the UI, the conditions harden: Jobicy requires apply buttons to point at the
canonical Jobicy job URL, Himalayas requires a visible link back and forbids
resubmission to other boards, Arbeitnow requires a link back on the platform.
Note today's apply link (`apps/web/src/components/features/job-matches/detail.tsx:193`)
uses `rel="noopener noreferrer"` — no `nofollow`, which is what Remote OK wants,
and it points at the employer's ATS posting, which is what Jobicy forbids for
*Jobicy* listings. Both are fine as long as feed data stays out of the postings
table.

### Smaller, cheap

- `seed.ts:156` requests `limit=100` from Himalayas, above their documented
  maximum of 20. Change the number.
- Himalayas documents a 24-hour cache; polling it more than daily is pointless
  and, given their ToS §30, not free of risk.
- The seeder's 200 ms per-host gap (`seed.ts:235`) is faster than the
  `Crawl-delay: 1` published by both Remote OK and `api.lever.co`. Raise the seed
  floor to 1 s for those hosts.
- Record a per-source flag in the database so a provider that later refuses can
  have its postings removed, rather than being hunted for by hand.

### Where the "whose data" question bites

For every ATS vendor the terms point the same way: the **employer** owns the job
posting and the vendor holds a licence to host it (Greenhouse MSA, Lever ToS
§4.2, Ashby §4.1). That matters in two directions, and the split is where a
lawyer earns their fee:

- It weakens the vendor's standing to grant *or* forbid third-party use of the
  content itself — but it does not weaken their control over the *endpoint*, which
  is theirs. SmartRecruiters can shut us out of their API regardless of who owns
  the postings.
- It means a takedown could come from either side: the employer over the posting,
  the vendor over the access. Facts are thin on copyright, but a reproduced job
  description is not a fact — it is written text, and storing and displaying it in
  full is the part most exposed. Storing the full description
  (`adapters/*.ts` all fetch `content=true` or equivalent) is a bigger claim than
  storing title, company, location and a link.

**Nothing above is legal advice.** The three items that need a lawyer, ranked:
Workday's terms scope over `myworkdayjobs.com`; whether reproducing full job
descriptions from any vendor is defensible for a commercial product; and whether
Ashby's "competitive product" clause could be argued to reach a job-aggregation
product built on their posting API.
