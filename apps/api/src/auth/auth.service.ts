import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthMailerService } from '../infrastructure/mailer/auth-mailer.service';
import { VerificationService } from './verification/verification.service';
import { User } from '@repo/db/entities/user';
import { Response } from 'express';
import { PasswordUtils } from '../common/utils/password.utils';
import { UserService } from '../features/user/user.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private authMailerService: AuthMailerService,
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

  signIn(email: string, response: Response): { success: boolean } {
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

    await this.authMailerService.sendVerificationEmail(user.email, token, {
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
    await this.authMailerService.sendOTPEmail(user.email, otp, {
      name: user.name,
      profilePictureUrl: user.avatar_url,
    });
    return { success: true };
  }

  // RESET PASSWORD FLOW
  async forgotPassword(user: User): Promise<{ success: boolean }> {
    const token = await this.verificationService.createResetPasswordToken(user);

    await this.authMailerService.sendResetPasswordEmail(user.email, token, {
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

    const user = resetPasswordToken.user;
    try {
      await this.authMailerService.sendResetPasswordConfirmationEmail(
        user.email,
        new Date().toISOString(),
        { name: user.name, profilePictureUrl: user.avatar_url },
      );
    } catch (err) {
      this.logger.warn(
        `Failed to enqueue reset-password-confirmation email for user ${user.id}: ${(err as Error).message}`,
      );
    }

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
  async findOrCreateLinkedinUser(linkedinUserData: {
    email: string;
    linkedinId: string;
    name?: string;
    avatarUrl?: string;
  }): Promise<User> {
    let user = await this.userService.findOneByEmail(linkedinUserData.email);

    if (user) {
      let changed = false;
      if (!user.linkedin_id) {
        user.linkedin_id = linkedinUserData.linkedinId;
        user.is_linkedin_user = true;
        changed = true;
      }
      if (linkedinUserData.avatarUrl && !user.avatar_url) {
        user.avatar_url = linkedinUserData.avatarUrl;
        changed = true;
      }
      if (!user.email_verified) {
        user.email_verified = true;
        changed = true;
      }
      if (changed) {
        await this.userService.update(user);
      }
      return user;
    }

    user = await this.userService.createLinkedinUser(
      linkedinUserData.email,
      '',
      linkedinUserData.name || 'LinkedIn User',
      linkedinUserData.linkedinId,
      linkedinUserData.avatarUrl,
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
      let changed = false;
      if (!user.google_id) {
        user.google_id = googleUserData.googleId;
        user.is_google_user = true;
        changed = true;
      }
      if (googleUserData.avatarUrl && !user.avatar_url) {
        user.avatar_url = googleUserData.avatarUrl;
        changed = true;
      }
      if (!user.email_verified) {
        user.email_verified = true;
        changed = true;
      }
      if (changed) {
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
