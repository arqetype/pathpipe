import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '@repo/db/entities/user';
import { Request } from 'express';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({ usernameField: 'email', passReqToCallback: true });
  }

  async validate(
    request: Request,
    email: string,
    password: string,
  ): Promise<User> {
    const { otp } = request.body as { otp?: string };

    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.email_verified) {
      try {
        await this.authService.sendVerification(user);
      } catch {
        throw new UnauthorizedException(
          'Failed to send verification email. Please try again later.',
          'verification_email_failed',
        );
      }

      throw new UnauthorizedException(
        'Email not verified. An email has been sent to verify your account.',
        'email_not_verified',
      );
    }

    if (user.need_otp && !otp) {
      await this.authService.sendOTP(user);

      throw new UnauthorizedException(
        'OTP is required for this account.',
        'otp_required',
      );
    }
    if (user.need_otp && otp) {
      const isValidOTP = await this.authService.verifyOTP(user, otp);
      if (!isValidOTP) {
        throw new UnauthorizedException('Invalid OTP', 'invalid_otp');
      }
    }

    return user;
  }
}
