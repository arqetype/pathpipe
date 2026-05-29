import { BadRequestErrorDto } from '@repo/db/dto/common/bad-request-error.dto';
import { InternalServerErrorDto } from '@repo/db/dto/common/internal-server-error.dto';
import { UnauthorizedErrorDto } from '@repo/db/dto/common/unauthorized-error.dto';
import { cookies } from 'next/headers';
import { cache } from 'react';

type BackendErrorDto =
  | BadRequestErrorDto
  | InternalServerErrorDto
  | UnauthorizedErrorDto;

type ResponseOk = Response & { ok: true };

type ResponseError = Response & {
  ok: false;
  status: number;
  statusText: string;
};

type FetchSuccess<T> = {
  ok: true;
  response: ResponseOk;
  data: T;
};

type FetchError = {
  ok: false;
  response: ResponseError;
  data: BackendErrorDto;
};

type FetchResult<T> = FetchSuccess<T> | FetchError;

async function parseResponseBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

const fetchWithAuth = cache(
  async <T = object>(
    path: string,
    options: RequestInit = {},
  ): Promise<FetchResult<T>> => {
    const cookieStore = await cookies();
    const authToken = cookieStore.get('auth-token');

    const headers: Record<string, string> = {
      ...(!(options.body instanceof FormData) && {
        'Content-Type': 'application/json',
      }),
      ...(options.headers as Record<string, string>),
    };

    if (authToken) {
      headers['Cookie'] = `auth-token=${authToken.value}`;
    }

    const response: ResponseOk | ResponseError = await fetch(
      `${process.env.NEXT_API_URL ?? process.env.NEXT_PUBLIC_API_URL}${path}`,
      {
        ...options,
        headers,
        credentials: 'include',
      },
    );

    const data = await parseResponseBody(response);

    return response.ok
      ? {
          ok: true,
          response: response as ResponseOk,
          data: data as T,
        }
      : {
          ok: false,
          response: response as ResponseError,
          data: data as BackendErrorDto,
        };
  },
);

const fetchPublic = cache(
  async <T = object>(
    path: string,
    options: RequestInit = {},
  ): Promise<FetchResult<T>> => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const response: ResponseOk | ResponseError = await fetch(
      `${process.env.NEXT_API_URL ?? process.env.NEXT_PUBLIC_API_URL}${path}`,
      {
        ...options,
        headers,
        credentials: 'include',
      },
    );

    const data = await parseResponseBody(response);

    return response.ok
      ? {
          ok: true,
          response: response as ResponseOk,
          data: data as T,
        }
      : {
          ok: false,
          response: response as ResponseError,
          data: data as BackendErrorDto,
        };
  },
);

export const get = cache(
  async <T = object>(path: string): Promise<FetchResult<T>> => {
    return fetchWithAuth<T>(path);
  },
);

export const getRaw = cache(async (path: string): Promise<Response | null> => {
  const cookieStore = await cookies();
  const authToken = cookieStore.get('auth-token');

  const headers: Record<string, string> = {};
  if (authToken) {
    headers['Cookie'] = `auth-token=${authToken.value}`;
  }

  const response = await fetch(
    `${process.env.NEXT_API_URL ?? process.env.NEXT_PUBLIC_API_URL}${path}`,
    {
      headers,
      credentials: 'include',
    },
  );

  return response.ok ? response : null;
});

export const post = cache(
  async <T = object>(path: string, body: unknown): Promise<FetchResult<T>> => {
    return fetchWithAuth<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
);

export const put = cache(
  async <T = object>(path: string, body: unknown): Promise<FetchResult<T>> => {
    return fetchWithAuth<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
);

export const del = cache(
  async <T = object>(path: string, body: unknown): Promise<FetchResult<T>> => {
    return fetchWithAuth<T>(path, {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  },
);

export const patch = cache(
  async <T = object>(path: string, body: unknown): Promise<FetchResult<T>> => {
    return fetchWithAuth<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
);

export const postForm = cache(
  async <T = object>(path: string, body: FormData): Promise<FetchResult<T>> => {
    return fetchWithAuth<T>(path, {
      method: 'POST',
      body,
    });
  },
);

export const publicGet = cache(
  async <T = object>(path: string): Promise<FetchResult<T>> => {
    return fetchPublic<T>(path);
  },
);

export const publicPost = cache(
  async <T = object>(path: string, body: unknown): Promise<FetchResult<T>> => {
    return fetchPublic<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  },
);

export const publicPut = cache(
  async <T = object>(path: string, body: unknown): Promise<FetchResult<T>> => {
    return fetchPublic<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  },
);

export const publicDel = cache(
  async <T = object>(path: string, body: unknown): Promise<FetchResult<T>> => {
    return fetchPublic<T>(path, {
      method: 'DELETE',
      body: JSON.stringify(body),
    });
  },
);

export const publicPatch = cache(
  async <T = object>(path: string, body: unknown): Promise<FetchResult<T>> => {
    return fetchPublic<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  },
);
