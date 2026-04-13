import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApplicationService } from './application.service';
import { type ApplicationsQuery } from '@repo/db/query/application';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@repo/db/entities/user';
import { UserRole } from '@repo/db/types/user/roles';
import { Application } from '@repo/db/entities/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { CreateApplicationDto } from '@repo/db/dto/application/create-application.dto';

@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @HttpCode(HttpStatus.OK)
  @Get()
  getAll(@CurrentUser() user: User, @Query() query: ApplicationsQuery) {
    if (user.role === UserRole.ADMIN) {
      return this.applicationService.findMany(query);
    }
    return this.applicationService.findMany(query, user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  getOne(@CurrentUser() user: User, @Param('id') id: string) {
    if (user.role === UserRole.ADMIN) {
      return this.applicationService.findById(id);
    }
    return this.applicationService.findByIdAndUser(id, user.id);
  }

  @HttpCode(HttpStatus.CREATED)
  @Post()
  create(
    @CurrentUser() user: User,
    @Body() applicationDto: CreateApplicationDto,
  ) {
    return this.applicationService.create(user, applicationDto);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body() data: Partial<Application>,
  ) {
    if (user.role === UserRole.ADMIN) {
      return this.applicationService.update(id, data);
    }
    return this.applicationService.updateByUser(id, user.id, data);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id/status')
  updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') status: ApplicationStatus,
  ) {
    if (user.role === UserRole.ADMIN) {
      return this.applicationService.updateStatus(id, status);
    }
    return this.applicationService.updateStatusByUser(id, user.id, status);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUser() user: User, @Param('id') id: string) {
    if (user.role === UserRole.ADMIN) {
      return this.applicationService.remove(id);
    }
    return this.applicationService.removeByUser(id, user.id);
  }
}
