import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { JobPostingService } from './job-posting.service';
import { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';
import {
  type JobPostingResponse,
  type JobPostingsQuery,
  type PaginatedJobPostings,
} from '@repo/db/query/job-posting';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
import { ApplicationStatus } from '@repo/db/types/application/status';
import { ApiKeyProtected } from '../../common/decorators/api-key-protected.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '@repo/db/entities/user';

@Controller('job-postings')
export class JobPostingController {
  constructor(private readonly jobPostingService: JobPostingService) {}

  @ApiKeyProtected()
  @HttpCode(HttpStatus.CREATED)
  @Post('internal/batch')
  async createBatch(@Body() dtos: CreateJobPostingDto[]) {
    return this.jobPostingService.createBatch(dtos);
  }

  @HttpCode(HttpStatus.OK)
  @Get()
  async findMany(
    @CurrentUser() user: User,
    @Query() query: JobPostingsQuery,
  ): Promise<PaginatedJobPostings> {
    return this.jobPostingService.findMany(user.id, query);
  }

  /** Open offers matching the user's profile that they have never opened. */
  @HttpCode(HttpStatus.OK)
  @Get('count')
  async countNew(@CurrentUser() user: User): Promise<{ count: number }> {
    const count = await this.jobPostingService.countNew(user.id);
    return { count };
  }

  @HttpCode(HttpStatus.OK)
  @Get(':id')
  async findOne(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<JobPostingResponse> {
    return this.jobPostingService.findOne(user.id, id);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id/status')
  async updateStatus(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') status: JobPostingStatus,
  ): Promise<void> {
    return this.jobPostingService.markAs(user.id, id, status);
  }

  @HttpCode(HttpStatus.OK)
  @Patch(':id/saved')
  async setSaved(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('saved') saved: boolean,
  ): Promise<JobPostingResponse> {
    return this.jobPostingService.setSaved(user.id, id, Boolean(saved));
  }

  /** Pushes the offer onto the applications board, or returns the existing one. */
  @HttpCode(HttpStatus.CREATED)
  @Post(':id/application')
  async track(
    @CurrentUser() user: User,
    @Param('id') id: string,
    @Body('status') status?: ApplicationStatus,
  ): Promise<{ applicationId: string; created: boolean }> {
    return this.jobPostingService.trackAsApplication(user, id, status);
  }
}
