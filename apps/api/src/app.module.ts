import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

import { User } from '@repo/db/entities/user';
import { Meal } from '@repo/db/entities/meal';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { Goal } from '@repo/db/entities/goal';
import { AIRequest } from '@repo/db/entities/ai-request';
import { HealthModule } from './health/health.module';
import { MailerModule } from './mailer/mailer.module';
import { AuthModule } from './auth/auth.module';
import { VerificationModule } from './verification/verification.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['./.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        type: 'postgres',
        host: process.env.NEST_DATABASE_HOST,
        port: parseInt(process.env.NEST_DATABASE_PORT, 10),
        username: process.env.NEST_DATABASE_USER,
        password: process.env.NEST_DATABASE_PASS,
        database: process.env.NEST_DATABASE_NAME,
        entities: [User, Meal, EmailVerificationToken, Goal, AIRequest],
        synchronize: process.env.NODE_ENV !== 'production',
      }),
    }),
    HealthModule,
    UserModule,
    MailerModule,
    AuthModule,
    VerificationModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
