import EnableOtp from '@/components/features/settings/enable-otp';
import { getCurrentUser } from '@/lib/auth-server';

export default async function SecuritySettingsPage() {
  const user = await getCurrentUser();
  return (
    <>
      <h1 className="scroll-m-20 text-left text-4xl font-extrabold tracking-tight text-balance mb-4">
        Security Settings
      </h1>
      <EnableOtp user={user} />
    </>
  );
}
