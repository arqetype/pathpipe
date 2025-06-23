import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { OTPVerification } from '@repo/db/entities/otp-verification';
import { ResetPasswordToken } from '@repo/db/entities/reset-password-token';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { User } from '@repo/db/entities/user';
import { createHash } from 'node:crypto';
import { UserService } from '../user/user.service';

/**
 * Service responsible for managing verification processes in the application.
 *
 * Handles email verification tokens, one-time passwords (OTP), and
 * reset password tokens for user authentication and verification workflows.
 */
@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(OTPVerification)
    private readonly otpVerificationRepository: Repository<OTPVerification>,
    @InjectRepository(ResetPasswordToken)
    private readonly resetPasswordTokenRepository: Repository<ResetPasswordToken>,
    private readonly userService: UserService,
  ) {}

  // EMAIL VERIFICATION METHODS
  /**
   * Creates a new email verification token for a user.
   *
   * Deletes any existing verification tokens for the user before creating a new one.
   * The token expires after 24 hours.
   *
   * @param user - The user to create a verification token for
   * @returns The plaintext verification token (before hashing)
   */
  async createVerificationToken(user: User): Promise<string> {
    await this.emailVerificationTokenRepository.delete({ user });

    const token = randomUUID();
    const emailVerificationToken = this.emailVerificationTokenRepository.create(
      {
        token: createHash('sha256').update(token).digest('hex'),
        user,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
        lastEmailSent: new Date(),
      },
    );
    await this.emailVerificationTokenRepository.save(emailVerificationToken);
    return token;
  }

  /**
   * Verifies an email verification token and returns the associated user.
   *
   * The token is removed after verification, whether successful or not.
   *
   * @param token - The plaintext verification token (will be hashed for comparison)
   * @returns The associated user if the token is valid, otherwise null
   */
  async verifyEmail(token: string): Promise<User> {
    const verificationToken =
      await this.emailVerificationTokenRepository.findOne({
        where: { token: createHash('sha256').update(token).digest('hex') },
        relations: ['user'],
      });

    if (!verificationToken || verificationToken.expires_at < new Date()) {
      return null;
    }

    const user = verificationToken.user;

    if (!user) return null;

    await this.emailVerificationTokenRepository.remove(verificationToken);
    return user;
  }

  /**
   * Finds an email verification token for a user by their email address.
   *
   * @param email - The email address to search for
   * @returns The verification token if found, otherwise null
   */
  async findTokenByEmail(
    email: string,
  ): Promise<EmailVerificationToken | null> {
    const user = await this.userService.findOneByEmail(email);
    if (!user) return null;

    return await this.emailVerificationTokenRepository.findOne({
      where: { user: { id: user.id } },
    });
  }

  // RESET PASSWORD METHODS
  /**
   * Creates a new reset password token for a user.
   *
   * Deletes any existing reset password tokens for the user before creating a new one.
   * The token expires after 15 minutes.
   *
   * @param user - The user to create a reset password token for
   * @returns The plaintext reset password token (before hashing)
   */
  async createResetPasswordToken(user: User): Promise<string> {
    await this.resetPasswordTokenRepository.delete({ user });

    const token = randomUUID();
    const resetPasswordToken = this.resetPasswordTokenRepository.create({
      token: createHash('sha256').update(token).digest('hex'),
      user,
      expires_at: new Date(Date.now() + 15 * 60 * 1000),
    });

    await this.resetPasswordTokenRepository.save(resetPasswordToken);
    return token;
  }

  /**
   * Verifies a reset password token and updates the user's password if valid.
   *
   * The token is removed after verification, whether successful or not.
   *
   * @param token - The plaintext reset password token (will be hashed for comparison)
   * @param newPassword - The new password to set for the user
   * @returns The associated user if the token is valid, otherwise null
   */
  async verifyResetPassword(
    token: string,
    newPassword: string,
  ): Promise<User | null> {
    const resetPasswordToken = await this.resetPasswordTokenRepository.findOne({
      where: { token: createHash('sha256').update(token).digest('hex') },
      relations: ['user'],
    });

    if (!resetPasswordToken || resetPasswordToken.expires_at < new Date()) {
      return null;
    }

    const user = resetPasswordToken.user;

    if (!user) return null;

    await this.userService.updatePassword(
      user.id,
      createHash('sha256').update(newPassword).digest('hex'),
    );

    await this.resetPasswordTokenRepository.remove(resetPasswordToken);
    return user;
  }

  /**
   * Finds a reset password token entity by the token string.
   *
   * @param token - The plaintext reset password token (will be hashed for comparison)
   * @returns The reset password token entity with user relation if found, otherwise null
   */
  async findOneByResetPasswordToken(
    token: string,
  ): Promise<ResetPasswordToken | null> {
    return await this.resetPasswordTokenRepository.findOne({
      where: { token: createHash('sha256').update(token).digest('hex') },
      relations: ['user'],
    });
  }

  // OTP METHODS
  /**
   * Creates a new one-time password (OTP) for a user.
   *
   * Deletes any existing OTPs for the user before creating a new one.
   * The OTP is a 6-digit number and expires after 10 minutes.
   *
   * @param user - The user to create an OTP for
   * @returns The plaintext OTP (before hashing)
   */
  async createOTP(user: User): Promise<string> {
    await this.otpVerificationRepository.delete({ user });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const otpVerification = this.otpVerificationRepository.create({
      otp: createHash('sha256').update(otp).digest('hex'),
      expires_at: expiresAt,
      lastSent: new Date(),
      user,
    });

    await this.otpVerificationRepository.save(otpVerification);
    return otp;
  }

  /**
   * Verifies a one-time password (OTP) for a user.
   *
   * The OTP is removed after verification, whether successful or not.
   *
   * @param user - The user the OTP belongs to
   * @param otp - The plaintext OTP (will be hashed for comparison)
   * @returns The user if the OTP is valid, otherwise null
   */
  async verifyOTP(user: User, otp: string): Promise<User> {
    const otpVerification = await this.otpVerificationRepository.findOne({
      where: {
        otp: createHash('sha256').update(otp).digest('hex'),
        user: { id: user.id },
      },
      relations: ['user'],
    });

    if (!otpVerification || otpVerification.expires_at < new Date()) {
      return null;
    }

    await this.otpVerificationRepository.remove(otpVerification);
    return user;
  }

  /**
   * Finds an OTP verification entity for a user.
   *
   * @param user - The user to find an OTP for
   * @returns The OTP verification entity if found, otherwise null
   */
  async findOTPByUser(user: User): Promise<OTPVerification | null> {
    if (!user) return null;

    return await this.otpVerificationRepository.findOne({
      where: { user: { id: user.id } },
    });
  }
}
