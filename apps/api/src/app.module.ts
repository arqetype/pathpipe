import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '@repo/db/entities/user';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { HealthModule } from './health/health.module';
import { MailerModule } from './mailer/mailer.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { OTPVerification } from '@repo/db/entities/otp-verification';
import { ResetPasswordToken } from '@repo/db/entities/reset-password-token';
import { ApplicationModule } from './application/application.module';
import { CompanyModule } from './company/company.module';
import { Candidate } from '@repo/db/entities/candidate';
import { JobOpening } from '@repo/db/entities/job-opening';
import { Company } from '@repo/db/entities/company';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['./.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.getOrThrow('NEST_DATABASE_HOST'),
        port: parseInt(configService.getOrThrow('NEST_DATABASE_PORT'), 10),
        username: configService.getOrThrow('NEST_DATABASE_USER'),
        password: configService.getOrThrow('NEST_DATABASE_PASS'),
        database: configService.getOrThrow('NEST_DATABASE_NAME'),
        entities: [
          User,
          EmailVerificationToken,
          OTPVerification,
          ResetPasswordToken,
          Candidate,
          JobOpening,
          Company,
        ],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    HealthModule,
    UserModule,
    MailerModule,
    AuthModule,
    JwtModule,
    ApplicationModule,
    CompanyModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
