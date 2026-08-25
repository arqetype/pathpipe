import { Controller, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@repo/db/types/user/roles';
import { User } from '@repo/db/entities/user';

@Controller('admin/v1')
export class AdminController {
  constructor(
    @Inject('DISCOVERY_QUEUE')
    private readonly discoveryQueue: Queue,
  ) {}

  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @Post('discover')
  async triggerDiscovery(@CurrentUser() user: User) {
    await this.discoveryQueue.add('run-discovery', { triggeredBy: user.id });
    return { status: 'triggered' };
  }
}
