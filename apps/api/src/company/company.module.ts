import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '@repo/db/entities/company';
import { Application } from '@repo/db/entities/application';
import { CompanyController } from './company.controller';
import { CompanyService } from './company.service';
import { CompanyCsvService } from './company-csv.service';
import { CompanyImageService } from './company-image.service';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Company, Application]),
    MulterModule.register({
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10 MB
      },
    }),
  ],
  providers: [CompanyService, CompanyCsvService, CompanyImageService],
  controllers: [CompanyController],
  exports: [CompanyService, CompanyImageService],
})
export class CompanyModule {}
