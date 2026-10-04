import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import {
  AUTH_MODE_KEY,
  type AuthMode,
  IS_PUBLIC_KEY,
} from '../../common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../features/user/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const authMode =
      this.reflector.getAllAndOverride<AuthMode>(AUTH_MODE_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? 'jwt';

    const request = context.switchToHttp().getRequest<Request>();

    if (authMode === 'api-key') {
      const apiKey = request.headers['x-api-key'] as string | undefined;
      if (!apiKey) {
        throw new UnauthorizedException('No API key provided');
      }

      return this.validateApiKey(apiKey);
    }

    return this.validateJwtCookie(request);
  }

  private validateApiKey(apiKey: string): boolean {
    const expected = this.configService.get<string>('NEST_INTERNAL_API_KEY');
    const digest = (value: string) =>
      createHash('sha256').update(value).digest();

    // Unset key rejects everything
    if (!expected || !timingSafeEqual(digest(apiKey), digest(expected))) {
      throw new UnauthorizedException('Invalid API key');
    }

    return true;
  }

  private async validateJwtCookie(request: Request): Promise<boolean> {
    const token = request.cookies['auth-token'] as string | undefined;
    if (!token) {
      throw new UnauthorizedException('No token cookie found');
    }

    try {
      const payload = await this.jwtService.verifyAsync<{ email: string }>(
        token,
        { secret: this.configService.getOrThrow('NEST_JWT_SECRET') },
      );

      const user = await this.userService.findOneByEmail(payload.email);

      if (!user.email_verified) {
        throw new UnauthorizedException('Email not verified');
      }

      request.user = user;
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid token');
    }
  }
}
