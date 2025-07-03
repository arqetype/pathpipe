import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@repo/db/entities/user';
import { DefaultEventsMap, Socket } from 'socket.io';

export type SocketWithUser = Socket<
  DefaultEventsMap,
  DefaultEventsMap,
  DefaultEventsMap,
  {
    user?: User;
    [key: string]: any;
  }
>;

export const WsCurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): User => {
    const client = ctx.switchToWs().getClient<SocketWithUser>();

    if (!client.data.user) {
      throw new Error('User not found in WebSocket context');
    }

    return client.data.user;
  },
);
