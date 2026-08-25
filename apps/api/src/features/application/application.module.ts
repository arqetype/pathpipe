import { Module, forwardRef } from '@nestjs/common';
import { ApplicationService } from './application.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApplicationController } from './application.controller';
import { Application } from '@repo/db/entities/application';
import { CompanyModule } from '../company/company.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Application]),
    forwardRef(() => CompanyModule),
  ],
  providers: [ApplicationService],
  exports: [ApplicationService],
  controllers: [ApplicationController],
})
export class ApplicationModule {}
