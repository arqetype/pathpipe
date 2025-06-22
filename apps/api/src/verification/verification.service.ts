import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { OTPVerification } from '@repo/db/entities/otp-verification';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { User } from '@repo/db/entities/user';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    @InjectRepository(OTPVerification)
    private readonly otpVerificationRepository: Repository<OTPVerification>,
    private readonly userService: UserService,
  ) {}

  async createVerificationToken(user: User): Promise<string> {
    await this.emailVerificationTokenRepository.delete({ user });

    const token = randomUUID();
    const emailVerificationToken = this.emailVerificationTokenRepository.create(
      {
        token,
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
        where: { token },
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

  async createOTP(user: User): Promise<string> {
    await this.otpVerificationRepository.delete({ user });
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const otpVerification = this.otpVerificationRepository.create({
      otp,
      expires_at: expiresAt,
      user,
    });

    await this.otpVerificationRepository.save(otpVerification);
    return otp;
  }

  async verifyOTP(user: User, otp: string): Promise<User> {
    const otpVerification = await this.otpVerificationRepository.findOne({
      where: { otp, user: { id: user.id } },
      relations: ['user'],
    });

    if (!otpVerification || otpVerification.expires_at < new Date()) {
      return null;
    }

    await this.otpVerificationRepository.remove(otpVerification);
    return user;
  }
}
