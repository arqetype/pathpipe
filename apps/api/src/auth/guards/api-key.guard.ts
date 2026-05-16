import {
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApiKey } from '@repo/db/entities/api-key';
import { IS_PUBLIC_KEY } from '../../common/decorators/public.decorator';
import type { Request } from 'express';

@Injectable()
export class ApiKeyGuard {
  constructor(
    private reflector: Reflector,
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

    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = request.headers['x-api-key'] as string | undefined;

    if (!apiKey) {
      return this.reject('No API key provided');
    }

    const foundKey = await this.apiKeyRepository.findOne({
      where: { key: apiKey, isActive: true },
    });

    if (!foundKey) {
      return this.reject('Invalid API key');
    }

    request.apiKey = foundKey;
    return true;
  }

  private reject(message: string): boolean {
    throw new UnauthorizedException(message);
  }
}
