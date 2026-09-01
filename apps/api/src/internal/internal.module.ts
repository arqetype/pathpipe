import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { Company } from '@repo/db/entities/company';
import { JobSource } from '@repo/db/entities/job-source';
import { InternalController } from './internal.controller';
import { JobSourceService } from './job-source.service';
import { CompanySeedService } from './company-seed.service';
import { JobPostingModule } from '../features/job-posting/job-posting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CompanyWatch, Company, JobSource]),
    JobPostingModule,
  ],
  controllers: [InternalController],
  providers: [JobSourceService, CompanySeedService],
})
export class InternalModule {}
