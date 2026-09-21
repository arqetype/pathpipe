import type {
  AdapterContext,
  HttpRequestOptions,
  HttpResponse,
} from '../types';

export const fakeHttp = (
  bodies:
    | Record<string, unknown>
    | ((url: string, options?: HttpRequestOptions) => unknown),
) => {
  const calls: Array<{ url: string; options?: HttpRequestOptions }> = [];
  const lookup = (url: string, options?: HttpRequestOptions): unknown =>
    typeof bodies === 'function' ? bodies(url, options) : bodies[url];

  return {
    calls,
    request: (
      url: string,
      options?: HttpRequestOptions,
    ): Promise<HttpResponse> => {
      calls.push({ url, options });
      const body = lookup(url, options);
      return Promise.resolve({
        status: body === undefined ? 404 : 200,
        ok: body !== undefined,
        url,
        body: typeof body === 'string' ? body : JSON.stringify(body ?? ''),
        retryAfter: null,
      });
    },
    json: <T>(url: string, options?: HttpRequestOptions): Promise<T | null> => {
      calls.push({ url, options });
      return Promise.resolve((lookup(url, options) ?? null) as T | null);
    },
  };
};

export const context = (
  http: ReturnType<typeof fakeHttp>,
  over: Partial<AdapterContext> = {},
): AdapterContext => ({ http, log: () => {}, ...over });

export const urlsOf = (http: ReturnType<typeof fakeHttp>): string[] =>
  http.calls.map((call) => call.url);
