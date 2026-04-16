import { Module } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationController } from './application.controller';
import { Application } from '@repo/db/entities/application';
import { Company } from '@repo/db/entities/company';

@Module({
  imports: [TypeOrmModule.forFeature([Application, Company])],
  providers: [ApplicationService],
  exports: [ApplicationService],
  controllers: [ApplicationController],
})
export class ApplicationModule {}
