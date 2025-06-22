import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '@repo/db/entities/user';
import { Meal } from '@repo/db/entities/meal';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { Goal } from '@repo/db/entities/goal';
import { AIRequest } from '@repo/db/entities/ai-request';
import { HealthModule } from './health/health.module';
import { MailerModule } from './mailer/mailer.module';
import { AuthModule } from './auth/auth.module';
import { VerificationModule } from './verification/verification.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard';
import { JwtModule } from '@nestjs/jwt';
import { OTPVerification } from '@repo/db/entities/otp-verification';

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
          Meal,
          EmailVerificationToken,
          Goal,
          AIRequest,
          OTPVerification,
        ],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    HealthModule,
    UserModule,
    MailerModule,
    AuthModule,
    JwtModule,
    VerificationModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
