import { User } from '@repo/db/entities/user';
import 'socket.io';

declare module 'socket.io' {
  interface Socket {
    user?: User;
  }
}
