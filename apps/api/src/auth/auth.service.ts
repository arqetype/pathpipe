import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '../infrastructure/mailer/mailer.service';
import { VerificationService } from './verification/verification.service';
import { User } from '@repo/db/entities/user';
import { Response } from 'express';
import { PasswordUtils } from '../common/utils/password.utils';
import { UserService } from '../features/user/user.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private verificationService: VerificationService,
  ) {}

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.userService.findOneWithPasswordByEmail(email);
    if (user && (await PasswordUtils.verifyPassword(password, user.password))) {
      return user;
    }
    return null;
  }

  generateJwtToken(email: string): string {
    return this.jwtService.sign({ email });
  }

  async signIn(
    email: string,
    response: Response,
  ): Promise<{ success: boolean }> {
    if (await this.userService.isGithubUser(email)) {
      throw new UnauthorizedException(
        'GitHub users cannot sign in with email and password',
      );
    }
    if (await this.userService.isGoogleUser(email)) {
      throw new UnauthorizedException(
        'Google users cannot sign in with email and password',
      );
    }

    const token = this.generateJwtToken(email);

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

  // EMAIL VERIFICATION FLOW
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

    await this.mailerService.sendVerificationEmail(user.email, token, {
      name: user.name,
      profilePictureUrl: user.avatar_url,
    });

    return { success: true };
  }

  // OTP FLOW
  async verifyOTP(user: User, otp: string): Promise<{ success: boolean }> {
    const result = await this.verificationService.verifyOTP(user, otp);

    if (!result) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

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
    await this.mailerService.sendOTPEmail(user.email, otp, {
      name: user.name,
      profilePictureUrl: user.avatar_url,
    });
    return { success: true };
  }

  // RESET PASSWORD FLOW
  async forgotPassword(user: User): Promise<{ success: boolean }> {
    const token = await this.verificationService.createResetPasswordToken(user);

    await this.mailerService.sendResetPasswordEmail(user.email, token, {
      name: user.name,
      profilePictureUrl: user.avatar_url,
    });

    return { success: true };
  }

  async verifyForgotPassword(token: string): Promise<{ success: boolean }> {
    const user =
      await this.verificationService.findOneByResetPasswordToken(token);
    if (!user) {
      throw new UnauthorizedException(
        'Invalid or expired forgot password token',
      );
    }

    return { success: true };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ success: boolean }> {
    const resetPasswordToken =
      await this.verificationService.findOneByResetPasswordToken(token);

    if (!resetPasswordToken) {
      throw new UnauthorizedException(
        'Invalid or expired reset password token',
      );
    }

    await this.userService.updatePassword(
      resetPasswordToken.user.id,
      await PasswordUtils.hashPassword(newPassword),
    );

    return { success: true };
  }

  async getResetPasswordUser(token: string): Promise<User | null> {
    const resetPasswordUser =
      await this.verificationService.findOneByResetPasswordToken(token);

    if (!resetPasswordUser) {
      throw new UnauthorizedException(
        'Invalid or expired reset password token',
      );
    }
    return resetPasswordUser.user;
  }

  // AUTH PROVIDERS FLOW
  async findOrCreateGithubUser(githubUserData: {
    email: string;
    githubId: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<User> {
    // Check if user already exists with this email
    let user = await this.userService.findOneByEmail(githubUserData.email);

    if (user) {
      // If the user exists but doesn't have GitHub ID set
      if (!user.github_id) {
        user.github_id = githubUserData.githubId;
        user.is_github_user = true;
        if (githubUserData.avatarUrl && !user.avatar_url) {
          user.avatar_url = githubUserData.avatarUrl;
        }
        await this.userService.update(user);
      }
      return user;
    }

    user = await this.userService.createGithubUser(
      githubUserData.email,
      '', // Password is not used for GitHub users, so we pass an empty string
      githubUserData.name || 'GitHub User',
      githubUserData.githubId,
      githubUserData.avatarUrl,
    );

    return user;
  }

  async findOrCreateGoogleUser(googleUserData: {
    email: string;
    googleId: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<User> {
    // Check if user already exists with this email
    let user = await this.userService.findOneByEmail(googleUserData.email);

    if (user) {
      // If the user exists but doesn't have Google ID set
      if (!user.google_id) {
        user.google_id = googleUserData.googleId;
        user.is_google_user = true;
        if (googleUserData.avatarUrl && !user.avatar_url) {
          user.avatar_url = googleUserData.avatarUrl;
        }
        await this.userService.update(user);
      }
      return user;
    }

    user = await this.userService.createGoogleUser(
      googleUserData.email,
      '', // Password is not used for Google users, so we pass an empty string
      googleUserData.name || 'Google User',
      googleUserData.googleId,
      googleUserData.avatarUrl,
    );

    return user;
  }
}
