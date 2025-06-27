import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, type Profile } from 'passport-github2';
import { AuthService } from '../auth.service';

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      clientID: configService.get<string>('GITHUB_CLIENT_ID'),
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: configService.get<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    // Get primary email from GitHub profile
    const emails = profile.emails;
    const primaryEmail = emails && emails.length > 0 ? emails[0].value : null;

    if (!primaryEmail) {
      throw new Error('No email found from GitHub profile');
    }

    // Create user if not exists or return existing user
    return this.authService.findOrCreateGithubUser({
      email: primaryEmail,
      name: profile.displayName || `${profile.username}`,
      githubId: profile.id,
      avatarUrl: profile._json.avatar_url,
    });
  }
}
