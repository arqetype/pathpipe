import EnableOtp from '@/components/enable-otp';
import { getCurrentUser } from '@/lib/auth-server';

export default async function SecuritySettingsPage() {
  const user = await getCurrentUser();
  return <EnableOtp user={user} />;
}
