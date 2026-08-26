import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { JobSource } from '@repo/db/entities/job-source';
import { InternalController } from './internal.controller';
import { JobSourceService } from './job-source.service';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyWatch, JobSource])],
  controllers: [InternalController],
  providers: [JobSourceService],
})
export class InternalModule {}
