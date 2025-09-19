import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';

@Injectable()
export class GoogleCallbackGuard extends AuthGuard('google') {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<Request>();
    // Allow if ?error is present in query
    if (request.query && typeof request.query.error === 'string') {
      return true;
    }
    return super.canActivate(context);
  }
}
