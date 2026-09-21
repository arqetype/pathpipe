import { Module, forwardRef } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationController } from './application.controller';
import { Application } from '@repo/db/entities/application';
import { CompanyModule } from '../company/company.module';
import { UserFileModule } from '../user/file/user-file.module';
import { JobEventModule } from '../job-event/job-event.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application]),
    forwardRef(() => CompanyModule),
    UserFileModule,
    JobEventModule,
  ],
  providers: [ApplicationService],
  exports: [ApplicationService],
  controllers: [ApplicationController],
})
export class ApplicationModule {}
