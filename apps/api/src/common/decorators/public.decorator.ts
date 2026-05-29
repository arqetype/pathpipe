import { applyDecorators, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const AUTH_MODE_KEY = 'authMode';

export type AuthMode = 'public' | 'jwt' | 'api-key';

export const Public = () =>
  applyDecorators(
    SetMetadata(IS_PUBLIC_KEY, true),
    SetMetadata(AUTH_MODE_KEY, 'public' satisfies AuthMode),
  );
