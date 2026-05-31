import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { AuthService } from '../auth.service';
import { User } from '@repo/db/entities/user';
import axios from 'axios';

@Injectable()
export class LinkedinStrategy extends PassportStrategy(Strategy, 'linkedin') {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {
    super({
      authorizationURL: 'https://www.linkedin.com/oauth/v2/authorization',
      tokenURL: 'https://www.linkedin.com/oauth/v2/accessToken',
      clientID: configService.get<string>('NEST_LINKEDIN_CLIENT_ID'),
      clientSecret: configService.get<string>('NEST_LINKEDIN_CLIENT_SECRET'),
      callbackURL: configService.get<string>('NEST_LINKEDIN_CALLBACK_URL'),
      scope: ['openid', 'profile', 'email'],
    });
  }

  async validate(accessToken: string): Promise<User> {
    const { data } = await axios.get<{
      sub: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      email?: string;
      picture?: string;
    }>('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!data.email) {
      throw new Error('No email found from LinkedIn profile');
    }

    const name =
      data.name ||
      [data.given_name, data.family_name].filter(Boolean).join(' ') ||
      'LinkedIn User';

    return this.authService.findOrCreateLinkedinUser({
      email: data.email,
      name,
      linkedinId: data.sub,
      avatarUrl: data.picture,
    });
  }
}
