import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { randomUUID } from 'node:crypto';
import { Repository } from 'typeorm';
import { UserService } from '../user/user.service';
import { User } from '@repo/db/entities/user';

@Injectable()
export class VerificationService {
  constructor(
    @InjectRepository(EmailVerificationToken)
    private readonly emailVerificationTokenRepository: Repository<EmailVerificationToken>,
    private readonly userService: UserService,
  ) {}

  async createVerificationToken(email: string): Promise<string> {
    const user = await this.userService.findOneByEmail(email);
    if (!user) throw new Error('User not found');

    const existingToken = await this.emailVerificationTokenRepository.findOne({
      where: { user },
    });

    if (existingToken) {
      if (existingToken.expires_at > new Date()) {
        return existingToken.token;
      } else {
        await this.emailVerificationTokenRepository.remove(existingToken);
      }
    }

    const token = randomUUID();
    const emailVerificationToken = this.emailVerificationTokenRepository.create(
      { token, user, expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) }, // Token valid for 24 hours
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
    if (!verificationToken) throw new Error('Invalid or expired token');

    const user = verificationToken.user;

    if (!user) throw new Error('User not found');

    await this.emailVerificationTokenRepository.remove(verificationToken);
    return user;
  }
}
