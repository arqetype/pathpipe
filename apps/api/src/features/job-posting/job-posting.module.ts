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
import { JobAlertService } from './job-alert.service';

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
  ],
  controllers: [JobPostingController],
  providers: [JobPostingService, JobAlertService],
  exports: [JobPostingService, JobAlertService],
})
export class JobPostingModule {}
