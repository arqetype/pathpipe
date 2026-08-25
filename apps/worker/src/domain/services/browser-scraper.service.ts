import { chromium } from 'playwright';
import type { ScrapedJob, ScrapeResult } from './scraper.service';
import { BLOCKED_TITLES, JOB_URL_PATTERNS } from './job-title-filters';

export class BrowserScraperService {
  async scrapeWithBrowser(careersUrl: string): Promise<ScrapeResult> {
    const browser = await chromium.launch({ headless: true });
    try {
      const page = await browser.newPage();
      await page.goto(careersUrl, { waitUntil: 'networkidle', timeout: 30000 });

      // Wait a bit for dynamic content
      await page.waitForTimeout(2000);

      // Try JSON-LD first
      const jsonLd = await page.evaluate(() => {
        const scripts = document.querySelectorAll('script[type="application/ld+json"]');
        const results: Array<{ title: string; url?: string; description?: string }> = [];
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent || '');
            const items = data['@graph'] ?? [data];
            for (const item of items) {
              if (item['@type'] === 'JobPosting') {
                results.push({
                  title: item.title,
                  url: item.url,
                  description: item.description,
                });
              }
            }
          } catch {}
        }
        return results;
      });

      if (jsonLd.length > 0) {
        return {
          jobs: jsonLd.map((j) => ({
            title: j.title,
            url: j.url ?? careersUrl,
            description: j.description,
          })),
        };
      }

      // Extract job listings from the rendered DOM
      const jobs = await page.evaluate((opts: { blockedTitles: string[]; jobUrlPatterns: string[] }) => {
        const results: Array<{ title: string; url: string }> = [];
        const seen = new Set<string>();

        const isJobTitle = (t: string): boolean => {
          const lower = t.toLowerCase().trim();
          if (lower.length < 6) return false;
          if (opts.blockedTitles.includes(lower)) return false;
          return true;
        };

        const isJobUrl = (u: string): boolean => {
          return opts.jobUrlPatterns.some((p) => new RegExp(p, 'i').test(u));
        };

        // Strategy 1: Links inside list items
        const liLinks = document.querySelectorAll('li a[href]');
        liLinks.forEach((a) => {
          const href = (a as HTMLAnchorElement).href;
          const title = a.textContent?.trim() || '';
          if (isJobTitle(title) && !seen.has(href)) {
            seen.add(href);
            results.push({ title, url: href });
          }
        });

        // Strategy 2: Elements with job-related classes
        if (results.length < 3) {
          const jobElements = document.querySelectorAll('[class*="job" i], [class*="position" i], [class*="career" i], [class*="opening" i], [class*="posting" i], [class*="title" i], [class*="role" i]');
          jobElements.forEach((el) => {
            const link = el.querySelector('a[href]');
            const href = (link as HTMLAnchorElement)?.href;
            const title = el.textContent?.trim() || link?.textContent?.trim() || '';
            if (href && isJobTitle(title) && !seen.has(href)) {
              seen.add(href);
              results.push({ title, url: href });
            }
          });
        }

        // Strategy 3: Any link that looks like a job URL
        if (results.length === 0) {
          const allLinks = document.querySelectorAll('a[href]');
          allLinks.forEach((a) => {
            const href = (a as HTMLAnchorElement).href;
            const title = a.textContent?.trim() || '';
            if (isJobUrl(href) && isJobTitle(title) && !seen.has(href)) {
              seen.add(href);
              results.push({ title, url: href });
            }
          });
        }

        return results;
      }, {
        blockedTitles: Array.from(BLOCKED_TITLES),
        jobUrlPatterns: JOB_URL_PATTERNS.map((r) => r.source),
      });

      return { jobs };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return { jobs: [], error: message };
    } finally {
      await browser.close();
    }
  }
}