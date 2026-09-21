import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserFile } from '@repo/db/entities/user-file';
import { UserFileService } from './user-file.service';
import { UserFileController } from './user-file.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserFile])],
  providers: [UserFileService],
  exports: [UserFileService],
  controllers: [UserFileController],
})
export class UserFileModule {}
