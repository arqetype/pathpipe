import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles: string[] =
      this.reflector.get<string[]>('roles', context.getHandler()) || [];

    const request: { user?: { role: string } } = context
      .switchToHttp()
      .getRequest();
    const user = request.user;

    return user ? requiredRoles.includes(user.role) : false;
  }
}
