import { chromium } from 'playwright';
import type { Browser, BrowserContext, Page, Route } from 'playwright';

export interface BrowserPoolOptions {
  userAgent: string;
  concurrency?: number;
  /** Close the browser after this long without work, to free memory. */
  idleTimeoutMs?: number;
  navigationTimeoutMs?: number;
  log?: (data: Record<string, unknown>, msg: string) => void;
  /**
   * Called when Chromium fails to start (missing binary, no sandbox, OOM).
   * Separate from `log` so the worker can raise it above debug noise.
   */
  onLaunchError?: (err: unknown) => void;
}

/** Resource types that never carry job data but cost most of the load time. */
const BLOCKED_RESOURCES = new Set([
  'image',
  'media',
  'font',
  'stylesheet',
  'imageset',
]);

/** Scrolls to the bottom repeatedly until the page stops growing. */
const SCROLL_SOURCE = String.raw`async () => {
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  let previousHeight = 0;
  for (let i = 0; i < 12; i++) {
    window.scrollTo(0, document.body.scrollHeight);
    await wait(250);
    const height = document.body.scrollHeight;
    if (height === previousHeight) break;
    previousHeight = height;
  }
  window.scrollTo(0, 0);
}`;

const BLOCKED_HOST_PATTERN =
  /(googletagmanager|google-analytics|doubleclick|facebook\.net|hotjar|segment\.(io|com)|intercom|mixpanel|sentry\.io|clarity\.ms|cookiebot|onetrust)/i;

/**
 * One Chromium instance shared by the whole discovery cycle.
 *
 * The old implementation launched a browser per company, which dominated the
 * cycle time. Here the browser is started on first use, reused across sources,
 * and shut down once the cycle goes idle.
 */
export class BrowserPool {
  private readonly userAgent: string;
  private readonly concurrency: number;
  private readonly idleTimeoutMs: number;
  private readonly navigationTimeoutMs: number;
  private readonly log: (data: Record<string, unknown>, msg: string) => void;
  private readonly onLaunchError: (err: unknown) => void;

  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private starting: Promise<BrowserContext> | null = null;
  private active = 0;
  private readonly waiters: Array<() => void> = [];
  private idleTimer: NodeJS.Timeout | null = null;

  constructor(options: BrowserPoolOptions) {
    this.userAgent = options.userAgent;
    this.concurrency = Math.max(1, options.concurrency ?? 3);
    this.idleTimeoutMs = options.idleTimeoutMs ?? 60000;
    this.navigationTimeoutMs = options.navigationTimeoutMs ?? 30000;
    this.log = options.log ?? (() => {});
    this.onLaunchError = options.onLaunchError ?? (() => {});
  }

  /**
   * Parses HTML that was already fetched over plain HTTP, using a real DOM.
   * Cheaper than a navigation and gives DOM-quality extraction for static pages.
   */
  async withParsedHtml<T>(
    html: string,
    baseUrl: string,
    fn: (page: Page) => Promise<T>,
  ): Promise<T> {
    return this.withPage(async (page) => {
      await page.setContent(this.withBaseTag(html, baseUrl), {
        waitUntil: 'domcontentloaded',
      });
      return fn(page);
    });
  }

  /**
   * Loads a URL and hands the live page to `fn`.
   *
   * The caller keeps the page and may navigate it — which is what following a
   * listing's pagination needs.
   */
  async withRenderedPage<T>(
    url: string,
    fn: (page: Page) => Promise<T>,
  ): Promise<T> {
    return this.withPage(async (page) => {
      await this.prepare(page, url);
      return fn(page);
    });
  }

  /** Navigate, settle, clear the consent wall, and trigger lazy loading. */
  private async prepare(page: Page, url: string): Promise<void> {
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: this.navigationTimeoutMs,
    });
    // Client-side boards need a beat after DOMContentLoaded to fetch.
    await page
      .waitForLoadState('networkidle', { timeout: 8000 })
      .catch(() => undefined);
    await this.dismissConsent(page);
    await this.scrollThrough(page);
  }

  async withPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
    await this.acquireSlot();
    let page: Page | null = null;
    try {
      const context = await this.ensureContext();
      page = await context.newPage();
      page.setDefaultTimeout(this.navigationTimeoutMs);
      return await fn(page);
    } finally {
      if (page) await page.close().catch(() => undefined);
      this.releaseSlot();
    }
  }

  async close(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    const browser = this.browser;
    this.context = null;
    this.browser = null;
    this.starting = null;
    if (browser) await browser.close().catch(() => undefined);
  }

  /** Relative hrefs must resolve against the real origin, not about:blank. */
  private withBaseTag(html: string, baseUrl: string): string {
    if (/<base\s/i.test(html)) return html;
    const tag = `<base href="${baseUrl.replace(/"/g, '&quot;')}">`;
    if (/<head[^>]*>/i.test(html)) {
      return html.replace(/<head([^>]*)>/i, `<head$1>${tag}`);
    }
    return `${tag}${html}`;
  }

  private async ensureContext(): Promise<BrowserContext> {
    if (this.context) return this.context;
    if (this.starting) return this.starting;

    this.starting = (async () => {
      this.log({}, 'Launching headless browser');
      const browser = await chromium.launch({
        headless: true,
        args: [
          '--disable-dev-shm-usage',
          '--disable-blink-features=AutomationControlled',
          '--no-sandbox',
        ],
      });
      const context = await browser.newContext({
        userAgent: this.userAgent,
        locale: 'en-US',
        viewport: { width: 1440, height: 1000 },
        javaScriptEnabled: true,
        serviceWorkers: 'block',
      });
      await context.route('**/*', (route: Route) => {
        const request = route.request();
        if (BLOCKED_RESOURCES.has(request.resourceType())) return route.abort();
        if (BLOCKED_HOST_PATTERN.test(request.url())) return route.abort();
        return route.continue();
      });
      this.browser = browser;
      this.context = context;
      return context;
    })();

    try {
      return await this.starting;
    } catch (err) {
      this.starting = null;
      // A browser that cannot start silently disables every render-based
      // strategy, so this must be loud even though callers treat it as a miss.
      this.onLaunchError(err);
      throw err;
    }
  }

  private async acquireSlot(): Promise<void> {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
    if (this.active < this.concurrency) {
      this.active++;
      return;
    }
    await new Promise<void>((resolve) => this.waiters.push(resolve));
    this.active++;
  }

  private releaseSlot(): void {
    this.active--;
    const next = this.waiters.shift();
    if (next) {
      next();
      return;
    }
    if (this.active === 0 && this.idleTimeoutMs > 0) {
      this.idleTimer = setTimeout(() => {
        void this.close();
      }, this.idleTimeoutMs);
      this.idleTimer.unref?.();
    }
  }

  /** Cookie walls hide the listing behind an overlay on many EU careers sites. */
  private async dismissConsent(page: Page): Promise<void> {
    const labels = [
      /^(accept|accept all|allow all|agree|i agree|got it|ok)$/i,
      /^(tout accepter|accepter|j'accepte|d'accord)$/i,
      /^(alle akzeptieren|akzeptieren|zustimmen)$/i,
      /^(aceptar todo|aceptar)$/i,
    ];
    for (const label of labels) {
      const button = page.getByRole('button', { name: label }).first();
      const clicked = await button
        .click({ timeout: 1200 })
        .then(() => true)
        .catch(() => false);
      if (clicked) {
        await page.waitForTimeout(400);
        return;
      }
    }
  }

  /** Triggers lazy-loaded and infinite-scroll listings. */
  private async scrollThrough(page: Page): Promise<void> {
    // Passed as a self-invoking source string, not a function: see
    // EXTRACTOR_SOURCE in generic/dom.ts for why a transpiled closure breaks
    // inside the page.
    await page.evaluate(`(${SCROLL_SOURCE})()`).catch(() => undefined);

    // A single "load more" click covers paginated boards without infinite scroll.
    for (let i = 0; i < 5; i++) {
      const button = page
        .getByRole('button', {
          name: /(load more|show more|voir plus|afficher plus|mehr laden|see more jobs)/i,
        })
        .first();
      const clicked = await button
        .click({ timeout: 1500 })
        .then(() => true)
        .catch(() => false);
      if (!clicked) break;
      await page.waitForTimeout(800);
    }
  }
}
