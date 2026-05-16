import { SetMetadata } from '@nestjs/common';
import { AUTH_MODE_KEY, type AuthMode } from './public.decorator';

export const ApiKeyProtected = () =>
  SetMetadata(AUTH_MODE_KEY, 'api-key' satisfies AuthMode);
