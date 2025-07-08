import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { OTPVerification } from '@repo/db/entities/otp-verification';
import { ResetPasswordToken } from '@repo/db/entities/reset-password-token';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { User } from '@repo/db/entities/user';
import { createHash } from 'node:crypto';
import { UserService } from '../../user/user.service';
import { PasswordUtils } from '../../common/utils/password.utils';

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
      await PasswordUtils.hashPassword(newPassword),
    );

    await this.resetPasswordTokenRepository.remove(resetPasswordToken);
    return user;
  }

  async findOneByResetPasswordToken(
    token: string,
  ): Promise<ResetPasswordToken | null> {
    return await this.resetPasswordTokenRepository.findOne({
      where: { token: createHash('sha256').update(token).digest('hex') },
      relations: ['user'],
    });
  }

  // OTP METHODS
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

  async verifyOTP(user: User, otp: string): Promise<User | null> {
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

  async findOTPByUser(user: User): Promise<OTPVerification | null> {
    if (!user) return null;

    return await this.otpVerificationRepository.findOne({
      where: { user: { id: user.id } },
    });
  }
}
