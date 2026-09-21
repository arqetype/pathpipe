import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobEvent } from '@repo/db/entities/job-event';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingInteraction } from '@repo/db/entities/job-posting-interaction';
import { JobEventService } from './job-event.service';

/**
 * A module of its own, rather than a service inside the job-posting one.
 *
 * Both the applications board and the offers board append to the log. Hanging
 * it off either would make the other import a whole feature to reach one
 * service, and applications importing job-postings — which already reaches into
 * applications — is exactly the cycle a `forwardRef` exists to paper over.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([JobEvent, JobPosting, JobPostingInteraction]),
  ],
  providers: [JobEventService],
  exports: [JobEventService],
})
export class JobEventModule {}
