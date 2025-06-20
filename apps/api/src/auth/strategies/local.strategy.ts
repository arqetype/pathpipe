import { Strategy } from 'passport-local';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { User } from '@repo/db/entities/user';
import { MailerService } from 'src/mailer/mailer.service';
import { VerificationService } from 'src/verification/verification.service';

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private readonly mailerService: MailerService,
    private readonly verificationService: VerificationService,
  ) {
    super({ usernameField: 'email' });
  }

  async validate(email: string, password: string): Promise<User> {
    const user = await this.authService.validateUser(email, password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.email_verified) {
      const token =
        await this.verificationService.createVerificationToken(email);

      await this.mailerService.sendVerificationEmail(email, token);

      throw new UnauthorizedException(
        'Email not verified. An email has been sent to verify your account.',
      );
    }

    return user;
  }
}
