import { getCurrentUser } from '@/lib/auth-server';

export default async function Header() {
  const user = await getCurrentUser();

  return (
    <header className="w-full h-16 flex justify-between items-center px-4 border-b border-black/60">
      <p>Mealbud.AI</p>
      <div>{user ? `Welcome, ${user.email}` : 'Please log in'}</div>
    </header>
  );
}
