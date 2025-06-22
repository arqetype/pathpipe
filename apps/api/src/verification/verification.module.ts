import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { UserModule } from '../user/user.module';
import { OTPVerification } from '@repo/db/entities/otp-verification';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmailVerificationToken, OTPVerification]),
    UserModule,
  ],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
