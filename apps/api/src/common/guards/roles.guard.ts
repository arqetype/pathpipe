import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@repo/db/types/user/roles';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles: string[] =
      this.reflector.get<string[]>('roles', context.getHandler()) || [];

    if (requiredRoles.length === 0) {
      return true;
    }

    const request: { user?: { role: UserRole } } = context
      .switchToHttp()
      .getRequest();
    const user = request.user;

    return user ? requiredRoles.includes(user.role) : false;
  }
}
