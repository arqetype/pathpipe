import {
  BadRequestException,
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
import {
  type ApplicationsQuery,
  type LocationSuggestion,
} from '@repo/db/query/application';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { JobEventType } from '@repo/db/types/job-event/type';
import { UserRole } from '@repo/db/types/user/roles';
import { Application } from '@repo/db/entities/application';
import { CreateApplicationDto } from '@repo/db/dto/application/create-application.dto';
import { User } from '@repo/db/entities/user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

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

  /**
   * Places to offer while somebody types a location.
   *
   * Declared before `:id` on purpose — Nest matches in order, and a route
   * parameter would otherwise swallow the word "locations".
   */
  @HttpCode(HttpStatus.OK)
  @Get('locations')
  getLocations(
    @CurrentUser() user: User,
    @Query('query') query?: string,
    @Query('limit') limit?: number | string,
  ): Promise<LocationSuggestion[]> {
    return this.applicationService.locationSuggestions(
      user.id,
      query ?? '',
      limit ? Number(limit) : 20,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  getOne(@CurrentUser() user: User, @Param('id') id: string) {
    if (user.role === UserRole.ADMIN) {
      return this.applicationService.findById(id);
    }
    return this.applicationService.findByIdAndUser(id, user.id);
  }

  /** Everything that has happened to this application, oldest first. */
  @HttpCode(HttpStatus.OK)
  @Get(':id/events')
  getEvents(@CurrentUser() user: User, @Param('id') id: string) {
    return this.applicationService.timeline(id, user.id);
  }

  /**
   * The job description as it read the day this application went out.
   *
   * Not a fetch of the offer's current page: boards edit postings in place and
   * take them down, so what is live today is no evidence of what was answered.
   */
  @HttpCode(HttpStatus.OK)
  @Get(':id/snapshot')
  getSnapshot(@CurrentUser() user: User, @Param('id') id: string) {
    return this.applicationService.snapshot(id, user.id);
  }

  /**
   * Record a follow-up, an interview, or an answer.
   *
   * One route for every event a user may state, rather than one route each:
   * which types are acceptable is a rule about the log, and it lives with the
   * log. `occurredAt` is optional and may be in the past — chasing a company on
   * Tuesday and writing it down on Friday is the normal case — but never in the
   * future, which is a typo, not a memory.
   */
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/events')
  recordEvent(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('type') type: JobEventType,
    @Body('occurredAt') occurredAt?: string,
    @Body('note') note?: string,
  ) {
    let when: Date | undefined;
    if (occurredAt) {
      when = new Date(occurredAt);
      if (Number.isNaN(when.getTime())) {
        throw new BadRequestException('occurredAt is not a date');
      }
      if (when.getTime() > Date.now()) {
        throw new BadRequestException('occurredAt is in the future');
      }
    }
    return this.applicationService.recordEvent(id, user.id, type, when, note);
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
