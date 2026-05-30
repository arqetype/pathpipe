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

  const isLinkedinUser = currentUser.is_linkedin_user;
  const isGoogleUser = currentUser.is_google_user;
  const hasOtpEnabled = currentUser.need_otp;

  return (
    <div className="flex items-center flex-col text-center pt-2">
      <div className="w-full flex justify-center">
        <Avatar className="size-24">
          <AvatarImage
            src={currentUser.avatar_url}
            alt={`Profile picture of ${currentUser.name}`}
          />
          <AvatarFallback className="font-4xl">{fallbackText}</AvatarFallback>
        </Avatar>
      </div>
      <h2 className="mt-4 text-2xl font-semibold">
        {currentUser.name}
        <span className="block text-sm text-muted-foreground">
          {currentUser.email}
        </span>
      </h2>
      <div className="mt-2 flex gap-2 flex-wrap justify-center">
        {isGoogleUser && isLinkedinUser && (
          <Badge variant="outline">Logged in with Google & LinkedIn</Badge>
        )}
        {isGoogleUser && !isLinkedinUser && (
          <Badge variant="outline">Logged in with Google</Badge>
        )}
        {!isGoogleUser && isLinkedinUser && (
          <Badge variant="outline">Logged in with LinkedIn</Badge>
        )}
        {!isGoogleUser && !isLinkedinUser && (
          <Badge variant="outline">Logged in with Email</Badge>
        )}
        {!isLinkedinUser && !isGoogleUser && hasOtpEnabled ? (
          <Badge variant="default">2FA Enabled</Badge>
        ) : !isLinkedinUser && !isGoogleUser && !hasOtpEnabled ? (
          <Badge variant="destructive">2FA Disabled</Badge>
        ) : null}
      </div>
    </div>
  );
}
