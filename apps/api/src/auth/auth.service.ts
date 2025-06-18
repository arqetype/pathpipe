import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { MailerService } from '../mailer/mailer.service';
import { VerificationService } from '../verification/verification.service';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private verificationService: VerificationService,
  ) {}

  async signIn(email: string, password: string): Promise<string> {
    const user = await this.userService.findOneByEmail(email);
    if (
      user?.password !== createHash('sha256').update(password).digest('hex')
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.jwtService.sign({ email: user.email });
  }

  async signUp(email: string, password: string): Promise<boolean> {
    const existingUser = await this.userService.findOneByEmail(email);
    if (existingUser) {
      throw new UnauthorizedException('Email already exists');
    }

    await this.userService.create(email, password);
    const token = await this.verificationService.createVerificationToken(email);
    await this.mailerService.sendVerificationEmail(email, token);

    return true;
  }

  async verifyEmail(token: string): Promise<boolean> {
    const user = await this.verificationService.verifyEmail(token);
    if (!user) {
      throw new UnauthorizedException('Invalid or expired verification token');
    }

    await this.userService.markEmailAsVerified(user.email);
    return true;
  }
}
