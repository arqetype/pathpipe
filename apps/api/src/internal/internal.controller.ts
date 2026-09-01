import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
} from '@nestjs/common';
import { ApiKeyProtected } from '../common/decorators/api-key-protected.decorator';
import { Repository } from 'typeorm';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { JobSourceService, JobSourceTask } from './job-source.service';
import { UpdateJobSourceStateDto } from '@repo/db/dto/job-posting/update-job-source-state.dto';
import {
  JobPostingService,
  StalePostingSummary,
} from '../features/job-posting/job-posting.service';
import { JobAlertService } from '../features/job-posting/job-alert.service';
import { ReconcileJobPostingsDto } from '@repo/db/dto/job-posting/reconcile-job-postings.dto';
import { ReportJobPostingValidityDto } from '@repo/db/dto/job-posting/job-posting-validity.dto';
import { SeedCompaniesDto } from '@repo/db/dto/company/seed-companies.dto';
import { CompanySeedService } from './company-seed.service';

@ApiKeyProtected()
@Controller('internal/v1')
export class InternalController {
  constructor(
    @InjectRepository(CompanyWatch)
    private readonly companyWatchRepository: Repository<CompanyWatch>,
    private readonly jobSourceService: JobSourceService,
    private readonly jobPostingService: JobPostingService,
    private readonly jobAlertService: JobAlertService,
    private readonly companySeedService: CompanySeedService,
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

  /**
   * Closes the offers a board stopped listing.
   *
   * The worker calls this only after a *complete* crawl of one source — a
   * truncated listing would read as "everything else is gone".
   */
  @HttpCode(HttpStatus.OK)
  @Post('job-postings/reconcile')
  async reconcileJobPostings(
    @Body() dto: ReconcileJobPostingsDto,
  ): Promise<{ closed: number }> {
    return this.jobPostingService.reconcile(dto);
  }

  /** Open offers most overdue for a "does this still exist?" probe. */
  @HttpCode(HttpStatus.OK)
  @Get('job-postings/stale')
  async getStaleJobPostings(
    @Query('limit') limit?: string,
    @Query('olderThanHours') olderThanHours?: string,
  ): Promise<StalePostingSummary[]> {
    // Offers that dated themselves out need no request to close.
    await this.jobPostingService.closeExpired();
    return this.jobPostingService.findStale(
      Number.parseInt(limit ?? '50', 10) || 50,
      Number.parseInt(olderThanHours ?? '48', 10) || 48,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('job-postings/validity')
  async reportJobPostingValidity(
    @Body() dto: ReportJobPostingValidityDto,
  ): Promise<{ closed: number; confirmed: number }> {
    return this.jobPostingService.applyValidity(dto.results ?? []);
  }

  /**
   * Queues a digest for every user with newly matched offers.
   *
   * The worker calls this once a cycle actually inserted something; who to tell
   * is a question about profiles, which live here.
   */
  /** Closes offers whose own advertised end date has passed. No network. */
  @HttpCode(HttpStatus.OK)
  @Post('job-postings/expire')
  async expireJobPostings(): Promise<{ closed: number }> {
    return { closed: await this.jobPostingService.closeExpired() };
  }

  @HttpCode(HttpStatus.OK)
  @Post('job-postings/notify')
  async notifyMatches(): Promise<{ notified: number; offers: number }> {
    return this.jobAlertService.notifyMatches();
  }

  /**
   * Registers boards a discovery run confirmed, so the crawler picks them up.
   *
   * Upserts by name: re-running a discovery must not double every company, and
   * a board whose URL moved should be corrected rather than duplicated.
   */
  @HttpCode(HttpStatus.OK)
  @Post('companies/seed')
  async seedCompanies(
    @Body() dto: SeedCompaniesDto,
  ): Promise<{ created: number; updated: number; unchanged: number }> {
    return this.companySeedService.seed(dto.companies);
  }

  /** Every company we know, for a discovery run to test against a vendor. */
  @HttpCode(HttpStatus.OK)
  @Get('companies')
  async listCompanies(): Promise<
    Array<{ id: string; name: string; careersUrl: string | null }>
  > {
    return this.companySeedService.list();
  }

  @HttpCode(HttpStatus.ACCEPTED)
  @Post('discover')
  async triggerDiscovery() {
    await this.discoveryQueue.add('run-discovery', {});
    return { status: 'triggered' };
  }
}
