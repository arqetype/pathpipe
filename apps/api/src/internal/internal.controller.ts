import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
} from '@nestjs/common';
import { ApiKeyProtected } from '../common/decorators/api-key-protected.decorator';
import { Repository } from 'typeorm';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { JobSourceService, JobSourceTask } from './job-source.service';
import { UpdateJobSourceStateDto } from '@repo/db/dto/job-posting/update-job-source-state.dto';

@ApiKeyProtected()
@Controller('internal/v1')
export class InternalController {
  constructor(
    @InjectRepository(CompanyWatch)
    private readonly companyWatchRepository: Repository<CompanyWatch>,
    private readonly jobSourceService: JobSourceService,
    @Inject('DISCOVERY_QUEUE')
    private readonly discoveryQueue: Queue,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Get('health')
  health() {
    return { status: 'ok' };
  }

  @HttpCode(HttpStatus.OK)
  @Get('watched-companies')
  async getWatchedCompanies() {
    const watches = await this.companyWatchRepository.find({
      relations: ['user', 'company'],
    });
    return watches.map((w) => ({
      userId: w.user.id,
      userEmail: w.user.email,
      userName: w.user.name ?? w.user.email,
      companyId: w.company.id,
      companyName: w.company.name,
      careersUrl: w.careersUrl ?? w.company.careersUrl,
      website: w.website ?? w.company.website,
    }));
  }

  /**
   * The crawl work list: one entry per careers URL with its watchers and the
   * fingerprint from the previous run.
   */
  @HttpCode(HttpStatus.OK)
  @Get('job-sources')
  async getJobSources(): Promise<JobSourceTask[]> {
    return this.jobSourceService.listTasks();
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('job-sources/state')
  async updateJobSourceState(
    @Body() dto: UpdateJobSourceStateDto,
  ): Promise<void> {
    await this.jobSourceService.updateState(dto);
  }

  @HttpCode(HttpStatus.ACCEPTED)
  @Post('discover')
  async triggerDiscovery() {
    await this.discoveryQueue.add('run-discovery', {});
    return { status: 'triggered' };
  }
}
