import { cookies } from 'next/headers';
import { cache } from 'react';

const getHeaders = async () => ({
  Cookie: (await cookies()).toString(),
});

export const get = cache(async (path: string) => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: { ...(await getHeaders()) },
  });

  console.log(await getHeaders());
  return res;
});
