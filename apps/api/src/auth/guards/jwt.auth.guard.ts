import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UserService } from '../../user/user.service';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly configService: ConfigService,
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

      request.user = { ...user, password: '••••••••••' };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
