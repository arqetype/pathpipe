import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) =>
          request.cookies['auth-token'] as string | undefined,
      ]),
      secretOrKey: configService.getOrThrow('NEST_JWT_SECRET'),
    });
  }

  validate(payload: { email: string }) {
    return { email: payload.email };
  }
}
