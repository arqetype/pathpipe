import type { ApiKey } from '@repo/db/entities/api-key';
import type { User } from '@repo/db/entities/user';

declare global {
  namespace Express {
    interface Request {
      user?: User;
      apiKey?: ApiKey;
    }
  }
}
