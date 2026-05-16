import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@repo/db/types/user/roles';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
