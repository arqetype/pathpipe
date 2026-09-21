import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '@repo/db/entities/application';
import { JobPostingModule } from '../job-posting/job-posting.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

@Module({
  imports: [TypeOrmModule.forFeature([Application]), JobPostingModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
