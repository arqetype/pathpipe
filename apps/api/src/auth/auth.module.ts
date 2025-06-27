import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { JwtModule } from '@nestjs/jwt';
import { MailerModule } from '../mailer/mailer.module';
import { VerificationModule } from '../verification/verification.module';
import { JwtStrategy } from './strategies/jwt.stategy';
import { LocalStrategy } from './strategies/local.strategy';
import { GithubStrategy } from './strategies/github.strategy';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';

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
          expiresIn: configService.get<string>('NEST_JWT_EXPIRATION_TIME'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, GithubStrategy],
  exports: [AuthService],
})
export class AuthModule {}
