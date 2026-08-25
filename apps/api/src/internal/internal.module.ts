import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { InternalController } from './internal.controller';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyWatch])],
  controllers: [InternalController],
})
export class InternalModule {}
