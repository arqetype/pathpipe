import type { User } from '@repo/db/entities/user';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}
