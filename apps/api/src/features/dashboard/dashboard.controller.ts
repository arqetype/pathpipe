import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { User } from '@repo/db/entities/user';
import type { DashboardResponse } from '@repo/db/query/dashboard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  overview(@CurrentUser() user: User): Promise<DashboardResponse> {
    return this.dashboardService.overview(user.id);
  }
}
