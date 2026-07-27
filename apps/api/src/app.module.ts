import { Module } from '@nestjs/common';
import { UserModule } from './features/user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User } from '@repo/db/entities/user';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { HealthModule } from './infrastructure/health/health.module';
import { MailerModule } from './infrastructure/mailer/mailer.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt.auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { JwtModule } from '@nestjs/jwt';
import { OTPVerification } from '@repo/db/entities/otp-verification';
import { ResetPasswordToken } from '@repo/db/entities/reset-password-token';
import { ApplicationModule } from './features/application/application.module';
import { CompanyModule } from './features/company/company.module';
import { Application } from '@repo/db/entities/application';
import { Company } from '@repo/db/entities/company';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { ApiKey } from '@repo/db/entities/api-key';
import { InternalModule } from './internal/internal.module';
import { resolve } from 'node:path';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: [
        resolve(
          process.cwd(),
          `../../.env.${process.env.NODE_ENV ?? 'development'}.local`,
        ),
        resolve(process.cwd(), '.env'),
      ],
    }),
    TypeOrmModule.forFeature([ApiKey]),
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
          Application,
          Company,
          CompanyWatch,
          ApiKey,
        ],
        synchronize: false,
        migrationsRun: true,
        migrations: [resolve(__dirname, 'migrations/common/*.{ts,js}')],
      }),
    }),
    HealthModule,
    UserModule,
    MailerModule,
    QueueModule,
    AuthModule,
    JwtModule,
    ApplicationModule,
    CompanyModule,
    InternalModule,

    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60000,
          limit: 60,
        },
      ],
    }),
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
