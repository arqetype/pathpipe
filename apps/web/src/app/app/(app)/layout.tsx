'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithAuth } from '../../../lib/auth-client';

export default function Layout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<{ name: string } | null>(null);

  useEffect(() => {
    const fetchUserInfo = async () => {
      const response = await fetchWithAuth(
        process.env.NEXT_PUBLIC_API_URL + '/auth/me',
      );

      if (response.ok) {
        const data = await response.json();
        setUserInfo(data);

        if (data.access_token) {
          localStorage.setItem('auth-token', data.access_token);
        }
      } else {
        localStorage.removeItem('auth-token');
        router.push('/app/sign-in');
      }
      setLoading(false);
    };

    fetchUserInfo();
  }, [router]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <>
      {userInfo && <div>Welcome, {userInfo.name}!</div>}
      {children}
    </>
  );
}
