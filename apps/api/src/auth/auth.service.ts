import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { MailerService } from '../mailer/mailer.service';
import { VerificationService } from '../verification/verification.service';
import { User } from '@repo/db/entities/user';
import { Response } from 'express';

/**
 * Service responsible for handling all authentication-related operations.
 *
 * This service manages user authentication, registration, email verification,
 * OTP verification, and password reset functionality.
 */
@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private verificationService: VerificationService,
  ) {}

  /**
   * Validates a user by checking their email and password.
   * @param email - The user's email.
   * @param password - The user's password.
   * @returns The user if valid, otherwise null.
   */
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

  /**
   * Generates a JWT token for the given email.
   * @param email - The user's email.
   * @returns The JWT token as a string.
   */
  generateJwtToken(email: string): string {
    return this.jwtService.sign({ email });
  }

  /**
   * Signs in a user by generating a JWT token and setting it in the response cookie.
   * @param email - The user's email.
   * @param response - The HTTP response object.
   * @returns An object indicating success.
   */
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

  /**
   * Signs up a new user by creating them in the database and sending a verification email.
   * @param name - The user's name.
   * @param email - The user's email.
   * @param password - The user's password.
   * @returns An object indicating success.
   * @throws {UnauthorizedException} If email already exists.
   */
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
  /**
   * Verifies a user's email using a token.
   * @param token - The verification token.
   * @returns An object indicating success.
   * @throws {UnauthorizedException} If token is invalid or expired.
   */
  async verifyEmail(token: string): Promise<{ success: boolean }> {
    const user = await this.verificationService.verifyEmail(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.userService.markEmailAsVerified(user.email);
    return { success: true };
  }

  /**
   * Resends a verification email to the user.
   * @param user - The user object.
   * @returns An object indicating success.
   * @throws {UnauthorizedException} If user not found, already verified, or too many requests.
   */
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

  // OTP FLOW
  /**
   * Verifies a one-time password (OTP) for the user.
   * @param user - The user object.
   * @param otp - The OTP to verify.
   * @returns An object indicating success.
   * @throws {UnauthorizedException} If OTP is invalid or expired.
   */
  async verifyOTP(user: User, otp: string): Promise<{ success: boolean }> {
    await this.verificationService.verifyOTP(user, otp);

    return { success: true };
  }

  /**
   * Sends a one-time password (OTP) to the user's email.
   * @param user - The user object.
   * @returns An object indicating success.
   * @throws {UnauthorizedException} If user not found or too many requests.
   */
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

  // RESET PASSWORD FLOW
  /**
   * Initiates the forgot password flow by sending a reset password email.
   * @param user - The user object.
   * @returns An object indicating success.
   * @throws {UnauthorizedException} If user not found.
   */
  async forgotPassword(user: User): Promise<{ success: boolean }> {
    const token = await this.verificationService.createResetPasswordToken(user);
    await this.mailerService.sendResetPasswordEmail(user.email, token);

    return { success: true };
  }

  /**
   * Verifies the forgot password token.
   * @param token - The reset password token.
   * @returns An object indicating success.
   * @throws {UnauthorizedException} If token is invalid or expired.
   */
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

  /**
   * Resets the user's password using the provided token and new password.
   * @param token - The reset password token.
   * @param newPassword - The new password to set.
   * @returns An object indicating success.
   * @throws {UnauthorizedException} If token is invalid or expired.
   */
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
      createHash('sha256').update(newPassword).digest('hex'),
    );

    return { success: true };
  }

  /**
   * Retrieves the user associated with a reset password token.
   * @param token - The reset password token.
   * @returns The user entity if found, otherwise throws an error.
   * @throws {UnauthorizedException} If token is invalid or expired.
   */
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

  /**
   * Finds or creates a user from GitHub authentication data.
   * @param githubUserData - Object containing user information from GitHub.
   * @returns The user entity.
   */
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

    // Create new user with GitHub data
    // Note: For GitHub users, we generate a random password since they'll never use password login
    const randomPassword = Math.random().toString(36).slice(-10);
    user = await this.userService.createGithubUser(
      githubUserData.email,
      randomPassword,
      githubUserData.name || 'GitHub User',
      githubUserData.githubId,
      githubUserData.avatarUrl,
    );

    return user;
  }
}
