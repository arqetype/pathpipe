import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20';
import { AuthService } from '../auth.service';
import { User } from '@repo/db/entities/user';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      clientID: configService.get<string>('NEST_GOOGLE_CLIENT_ID'),
      clientSecret: configService.get<string>('NEST_GOOGLE_CLIENT_SECRET'),
      callbackURL: configService.get<string>('NEST_GOOGLE_CALLBACK_URL'),
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<User> {
    const emails = profile.emails;
    const primaryEmail = emails && emails.length > 0 ? emails[0].value : null;

    if (!primaryEmail) {
      throw new Error('No email found from Google profile');
    }

    const user = await this.authService.findOrCreateGoogleUser({
      email: primaryEmail,
      name: profile.displayName || `${profile.username}`,
      googleId: profile.id,
      avatarUrl:
        profile.photos && profile.photos.length > 0
          ? profile.photos[0].value
          : null,
    });

    done(null, user);
    return user;
  }
}
