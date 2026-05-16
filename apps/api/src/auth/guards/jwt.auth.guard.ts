import {
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Request } from 'express';
import { UserService } from '../../user/user.service';
import { ApiKey } from '@repo/db/entities/api-key';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
    @InjectRepository(ApiKey)
    private readonly apiKeyRepository: Repository<ApiKey>,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    const request = context.switchToHttp().getRequest<Request>();

    const apiKey = request.headers['x-api-key'] as string | undefined;
    if (apiKey) {
      return this.validateApiKey(request, apiKey);
    }

    const token = request.cookies['auth-token'] as string | undefined;

    if (!token) throw new UnauthorizedException('No token cookie found');

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
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
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
}
