import { getCurrentUser } from '@/lib/auth-server';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@repo/ui/components/avatar';
import { Badge } from '@repo/ui/components/badge';

export default async function SettingsUserInfo() {
  const currentUser = await getCurrentUser();

  const fallbackText = currentUser.name
    ? currentUser.name
        .split(' ')
        .map((name) => name.charAt(0).toUpperCase())
        .join('')
    : 'UU';

  const isGithubUser = currentUser.is_github_user;
  const hasOtpEnabled = currentUser.need_otp;

  return (
    <div className="flex items-center flex-col text-center pt-2">
      <Avatar className="w-3/5 aspect-square h-full">
        <AvatarImage
          src={currentUser.avatar_url}
          alt={`Profile picture of ${currentUser.name}`}
        />
        <AvatarFallback className="font-4xl">{fallbackText}</AvatarFallback>
      </Avatar>
      <h2 className="mt-4 text-2xl font-semibold">
        {currentUser.name}
        <span className="block text-sm text-muted-foreground">
          {currentUser.email}
        </span>
      </h2>
      <div className="mt-2 flex gap-2">
        <Badge variant="outline">
          {isGithubUser ? 'Logged in with GitHub' : 'Logged in with Email'}
        </Badge>
        {!isGithubUser && hasOtpEnabled ? (
          <Badge variant="default">2FA Enabled</Badge>
        ) : !isGithubUser && !hasOtpEnabled ? (
          <Badge variant="destructive">2FA Disabled</Badge>
        ) : null}
      </div>
    </div>
  );
}
