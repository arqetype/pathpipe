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

  async signUp(email: string, password: string): Promise<{ success: boolean }> {
    const existingUser = await this.userService.findOneByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    await this.userService.create(email, password);
    const token = await this.verificationService.createVerificationToken(email);
    await this.mailerService.sendVerificationEmail(email, token);

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

  async resendEmail(email: string): Promise<{ success: boolean }> {
    const user = await this.userService.findOneByEmail(email);
    if (!user || user.email_verified) {
      throw new UnauthorizedException(
        'User not found or email already verified',
      );
    }

    const tokenRecord = await this.verificationService.findTokenByEmail(email);
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
      );
    }

    const token = await this.verificationService.createVerificationToken(email);
    await this.mailerService.sendVerificationEmail(email, token);

    return { success: true };
  }
}
