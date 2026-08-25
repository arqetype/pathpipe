import { BrowserScraperService } from './browser-scraper.service';
import { BLOCKED_TITLES, JOB_URL_PATTERNS } from './job-title-filters';

export interface ScrapedJob {
  title: string;
  url: string;
  description?: string;
  location?: string;
  salaryMin?: number;
  salaryMax?: number;
  postedAt?: string;
}

export interface ScrapeResult {
  jobs: ScrapedJob[];
  error?: string;
}

export class ScraperService {
  private readonly browserScraper: BrowserScraperService;

  constructor() {
    this.browserScraper = new BrowserScraperService();
  }

  async scrapeCareersPage(careersUrl: string): Promise<ScrapeResult> {
    // Try HTTP fetch first (fast)
    try {
      const response = await fetch(careersUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PathpipeBot/1.0)' },
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        const html = await response.text();
        const result = this.parseJobsFromHtml(html, careersUrl);
        if (result.jobs.length > 0) return result;
      }
    } catch {}

    // HTTP returned no jobs — try headless browser for JS-rendered pages
    return this.browserScraper.scrapeWithBrowser(careersUrl);
  }

  private parseJobsFromHtml(html: string, baseUrl: string): ScrapeResult {
    const jsonLdJobs = this.tryJsonLd(html, baseUrl);
    if (jsonLdJobs.length > 0) {
      return { jobs: jsonLdJobs };
    }

    const jobs = this.trySmartExtraction(html, baseUrl);
    return { jobs };
  }

  private tryJsonLd(html: string, baseUrl: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];
    const regex = /<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        const data = JSON.parse(match[1]);
        const items = data['@graph'] ?? [data];
        for (const item of items) {
          if (item['@type'] === 'JobPosting' || item['@type'] === 'jobposting') {
            jobs.push({
              title: item.title,
              url: item.url ?? baseUrl,
              description: item.description,
              location: item.jobLocation?.address?.addressLocality ?? item.jobLocation?.addressLocality,
              salaryMin: item.baseSalary?.value?.minValue ? Number(item.baseSalary.value.minValue) : undefined,
              salaryMax: item.baseSalary?.value?.maxValue ? Number(item.baseSalary.value.maxValue) : undefined,
              postedAt: item.datePosted,
            });
          }
        }
      } catch {}
    }
    return jobs;
  }

  private isJobUrl(href: string): boolean {
    return JOB_URL_PATTERNS.some((p) => p.test(href));
  }

  private isJobTitle(title: string): boolean {
    const lower = title.toLowerCase().trim();
    if (lower.length < 6) return false;
    if (BLOCKED_TITLES.has(lower)) return false;
    if (/^(about|privacy|terms|cookies|legal|contact|help|faq)/i.test(lower)) return false;
    if (/^(sign\s|my\s|account|settings|profile)/i.test(lower)) return false;
    if (/^(mentions|confidentialité|protection|vérifier)/i.test(lower)) return false;
    return true;
  }

  private trySmartExtraction(html: string, baseUrl: string): ScrapedJob[] {
    const jobs: ScrapedJob[] = [];
    const seen = new Set<string>();

    // Strategy 1: Look for links inside <li> elements (most common job listing pattern)
    const liLinkRegex = /<li[^>]*>[\s\S]*?<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<\/li>/gi;
    let match;
    while ((match = liLinkRegex.exec(html)) !== null) {
      const title = match[2].replace(/<[^>]+>/g, '').trim();
      const href = this.resolveUrl(match[1], baseUrl);
      if (this.isJobTitle(title) && !seen.has(href)) {
        seen.add(href);
        jobs.push({ title, url: href });
      }
    }

    // Strategy 2: Look for links with job-related classes/IDs
    if (jobs.length < 3) {
      const classLinkRegex = /<a[^>]*class="[^"]*(?:job|position|career|opening|posting|title|role)[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((match = classLinkRegex.exec(html)) !== null) {
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const href = this.resolveUrl(match[1], baseUrl);
        if (this.isJobTitle(title) && !seen.has(href)) {
          seen.add(href);
          jobs.push({ title, url: href });
        }
      }
    }

    // Strategy 3: Fallback - any link that looks like a job URL
    if (jobs.length === 0) {
      const allLinkRegex = /<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
      while ((match = allLinkRegex.exec(html)) !== null) {
        const title = match[2].replace(/<[^>]+>/g, '').trim();
        const href = this.resolveUrl(match[1], baseUrl);
        if (this.isJobUrl(href) && this.isJobTitle(title) && !seen.has(href)) {
          seen.add(href);
          jobs.push({ title, url: href });
        }
      }
    }

    return jobs;
  }

  private resolveUrl(href: string, baseUrl: string): string {
    if (href.startsWith('http')) return href;
    if (href.startsWith('//')) return `https:${href}`;
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }
}