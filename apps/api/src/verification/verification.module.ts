import { Module } from '@nestjs/common';
import { VerificationService } from './verification.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { UserModule } from '../user/user.module';
import { OTPVerification } from '@repo/db/entities/otp-verification';
import { ResetPasswordToken } from '@repo/db/entities/reset-password-token';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EmailVerificationToken,
      OTPVerification,
      ResetPasswordToken,
    ]),
    UserModule,
  ],
  providers: [VerificationService],
  exports: [VerificationService],
})
export class VerificationModule {}
