import EnableOtp from '@/components/enable-otp';
import { getCurrentUser } from '@/lib/auth-server';

export default async function SecuritySettingsPage() {
  const user = await getCurrentUser();
  return (
    <>
      <h1 className="text-2xl font-semibold mb-4">Security Settings</h1>
      <EnableOtp user={user} />
    </>
  );
}
