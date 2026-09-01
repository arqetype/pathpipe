import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { memoryStorage } from 'multer';
import { Company } from '@repo/db/entities/company';
import { JobPreference } from '@repo/db/entities/job-preference';
import { JobPreferenceController } from './job-preference.controller';
import { JobPreferenceService } from './job-preference.service';
import { RESUME_MAX_BYTES } from './resume-file';

@Module({
  imports: [
    TypeOrmModule.forFeature([JobPreference, Company]),
    // In memory and capped: a CV is read once for its text and never stored as
    // a file, so nothing should reach the disk on the way through.
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: RESUME_MAX_BYTES },
    }),
  ],
  controllers: [JobPreferenceController],
  providers: [JobPreferenceService],
  exports: [JobPreferenceService],
})
export class JobPreferenceModule {}
