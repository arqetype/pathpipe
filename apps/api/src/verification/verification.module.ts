import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { UserModule } from '../user/user.module';

@Module({
  imports: [TypeOrmModule.forFeature([EmailVerificationToken]), UserModule],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
