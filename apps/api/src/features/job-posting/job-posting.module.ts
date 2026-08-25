import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobPosting } from '@repo/db/entities/job-posting';
import { JobPostingController } from './job-posting.controller';
import { JobPostingService } from './job-posting.service';

@Module({
  imports: [TypeOrmModule.forFeature([JobPosting])],
  controllers: [JobPostingController],
  providers: [JobPostingService],
  exports: [JobPostingService],
})
export class JobPostingModule {}
