import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query } from '@nestjs/common';
import { JobPostingService } from './job-posting.service';
import { CreateJobPostingDto } from '@repo/db/dto/job-posting/create-job-posting.dto';
import { JobPostingResponse } from '@repo/db/query/job-posting';
import { JobPostingStatus } from '@repo/db/types/job-posting/status';
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
  async findByUser(
    @CurrentUser() user: User,
    @Query('status') status?: JobPostingStatus,
  ): Promise<JobPostingResponse[]> {
    return this.jobPostingService.findByUser(user.id, status);
  }

  @HttpCode(HttpStatus.OK)
  @Get('count')
  async countNew(@CurrentUser() user: User): Promise<{ count: number }> {
    const count = await this.jobPostingService.countNew(user.id);
    return { count };
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

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  async delete(
    @CurrentUser() user: User,
    @Param('id') id: string,
  ): Promise<void> {
    return this.jobPostingService.delete(user.id, id);
  }
}
