import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule } from '../infrastructure/mailer/mailer.module';
import { JwtStrategy } from './strategies/jwt.stategy';
import { LocalStrategy } from './strategies/local.strategy';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { VerificationModule } from './verification/verification.module';
import { GoogleStrategy } from './strategies/google.strategy';
import { LinkedinStrategy } from './strategies/linkedin.strategy';
import { UserModule } from '../features/user/user.module';

@Module({
  imports: [
    ConfigModule,
    UserModule,
    MailerModule,
    VerificationModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('NEST_JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<number>('NEST_JWT_EXPIRATION_TIME'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    LocalStrategy,
    JwtStrategy,
    GoogleStrategy,
    LinkedinStrategy,
  ],
  exports: [AuthService],
})
export class AuthModule {}
