import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingLocation } from '@repo/db/entities/job-posting-location';
import { JobPostingInteraction } from '@repo/db/entities/job-posting-interaction';
import { JobPreference } from '@repo/db/entities/job-preference';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { Application } from '@repo/db/entities/application';
import { JobPostingController } from './job-posting.controller';
import { JobPostingService } from './job-posting.service';
import { JobPostingIngestService } from './ingest/job-posting-ingest.service';
import { JobPostingInteractionService } from './interaction/job-posting-interaction.service';
import { JobPostingLifecycleService } from './ingest/job-posting-lifecycle.service';
import { JobAlertService } from './alert/job-alert.service';
import { JobEventModule } from '../job-event/job-event.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      JobPosting,
      JobPostingLocation,
      JobPostingInteraction,
      JobPreference,
      CompanyWatch,
      Application,
    ]),
    JobEventModule,
  ],
  controllers: [JobPostingController],
  providers: [
    JobPostingService,
    JobPostingIngestService,
    JobPostingInteractionService,
    JobPostingLifecycleService,
    JobAlertService,
  ],
  exports: [
    JobPostingService,
    JobPostingIngestService,
    JobPostingInteractionService,
    JobPostingLifecycleService,
    JobAlertService,
  ],
})
export class JobPostingModule {}
