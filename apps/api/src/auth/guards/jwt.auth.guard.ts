import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { ApiKey } from '@repo/db/entities/api-key';
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
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
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

      return this.validateApiKey(request, apiKey);
    }

    return this.validateJwtCookie(request);
  }

  private async validateApiKey(
    request: Request,
    apiKey: string,
  ): Promise<boolean> {
    const foundKey = await this.apiKeyRepository.findOne({
      where: { key: apiKey, isActive: true },
      relations: { user: true },
    });

    if (!foundKey || !foundKey.user) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.apiKey = foundKey;
    request.user = foundKey.user;
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
