import { Controller, Get, HttpCode, HttpStatus, Inject, Post } from '@nestjs/common';
import { ApiKeyProtected } from '../common/decorators/api-key-protected.decorator';
import { Repository } from 'typeorm';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';

@ApiKeyProtected()
@Controller('internal/v1')
export class InternalController {
  constructor(
    @InjectRepository(CompanyWatch)
    private readonly companyWatchRepository: Repository<CompanyWatch>,
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
      userName: w.user.name,
      companyId: w.company.id,
      companyName: w.company.name,
      careersUrl: w.careersUrl ?? w.company.careersUrl,
      website: w.website ?? w.company.website,
    }));
  }

  @HttpCode(HttpStatus.ACCEPTED)
  @Post('discover')
  async triggerDiscovery() {
    await this.discoveryQueue.add('run-discovery', {});
    return { status: 'triggered' };
  }
}
