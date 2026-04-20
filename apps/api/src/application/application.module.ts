import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationController } from './application.controller';
import { Candidate } from '@repo/db/entities/candidate';
import { JobOpening } from '@repo/db/entities/job-opening';

@Module({
  imports: [TypeOrmModule.forFeature([Candidate, JobOpening])],
  providers: [ApplicationService],
  exports: [ApplicationService],
  controllers: [ApplicationController],
})
export class ApplicationModule {}
