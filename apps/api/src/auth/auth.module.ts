import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { jwtConstants, jwtExpiresIn } from './constants';
import { MailerModule } from '../mailer/mailer.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [
    UserModule,
    MailerModule,
    VerificationModule,
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: jwtExpiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
