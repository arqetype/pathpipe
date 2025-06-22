import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { MailerService } from '../mailer/mailer.service';
import { VerificationService } from '../verification/verification.service';
import { User } from '@repo/db/entities/user';
import { Response } from 'express';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private verificationService: VerificationService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findOneByEmail(email);
    if (
      user &&
      user.password === createHash('sha256').update(password).digest('hex')
    ) {
      return user;
    }
    return null;
  }

  signIn(email: string, response: Response): { success: boolean } {
    const token = this.jwtService.sign({ email });

    response.cookie('auth-token', token, {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      path: '/',
      sameSite: 'lax',
    });

    return {
      success: true,
    };
  }

  async signUp(
    name: string,
    email: string,
    password: string,
  ): Promise<{ success: boolean }> {
    const existingUser = await this.userService.findOneByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    const user = await this.userService.create(email, password, name);
    void this.sendVerification(user);

    return { success: true };
  }

  async verifyEmail(token: string): Promise<{ success: boolean }> {
    const user = await this.verificationService.verifyEmail(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.userService.markEmailAsVerified(user.email);
    return { success: true };
  }

  async sendVerification(user: User): Promise<{ success: boolean }> {
    if (!user || user.email_verified) {
      throw new UnauthorizedException(
        'User not found or email already verified',
      );
    }

    const tokenRecord = await this.verificationService.findTokenByEmail(
      user.email,
    );
    const cooldownPeriod = 30 * 1000; // 30 sec
    const currentTime = Date.now();
    let lastEmailSent = 0;
    if (tokenRecord && tokenRecord.lastEmailSent) {
      lastEmailSent = new Date(tokenRecord.lastEmailSent).getTime();
    }
    if (currentTime - lastEmailSent < cooldownPeriod) {
      const remainingTime = Math.ceil(
        (cooldownPeriod - (currentTime - lastEmailSent)) / 1000,
      );
      throw new UnauthorizedException(
        `Please wait ${remainingTime} seconds before requesting another verification email.`,
        'email_verification_cooldown',
      );
    }

    const token = await this.verificationService.createVerificationToken(user);
    await this.mailerService.sendVerificationEmail(user.email, token);

    return { success: true };
  }

  async verifyOTP(user: User, otp: string): Promise<{ success: boolean }> {
    await this.verificationService.verifyOTP(user, otp);

    return { success: true };
  }

  async sendOTP(user: User): Promise<{ success: boolean }> {
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const otpRecord = await this.verificationService.findOTPByUser(user);
    const cooldownPeriod = 15 * 1000; // 15 seconds
    const currentTime = Date.now();
    let lastOtpSent = 0;

    if (otpRecord && otpRecord.lastSent) {
      lastOtpSent = new Date(otpRecord.lastSent).getTime();
    }

    if (currentTime - lastOtpSent < cooldownPeriod) {
      const remainingTime = Math.ceil(
        (cooldownPeriod - (currentTime - lastOtpSent)) / 1000,
      );
      throw new UnauthorizedException(
        `Please wait ${remainingTime} seconds before requesting another OTP.`,
        'otp_cooldown',
      );
    }

    const otp = await this.verificationService.createOTP(user);
    await this.mailerService.sendOTPEmail(user.email, otp);
    return { success: true };
  }
}
