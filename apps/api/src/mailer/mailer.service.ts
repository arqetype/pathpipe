import { Injectable } from '@nestjs/common';
import { Mailer } from '@repo/email';

@Injectable()
export class MailerService {
  private readonly mailer: Mailer;

  constructor() {
    if (process.env.NODE_ENV === 'development') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }
    this.mailer = new Mailer({
      host: process.env.NEST_EMAIL_HOST,
      port: Number(process.env.NEST_EMAIL_PORT),
      auth: {
        user: process.env.NEST_EMAIL_USER,
        pass: process.env.NEST_EMAIL_PASS,
      },
      from: '"Weaver" <no-reply@weareweaver.org>',
    });
  }

  async sendVerificationEmail(
    to: string,
    token: string,
    user: { name: string; profilePictureUrl: string },
  ) {
    await this.mailer.sendVerificationEmail(to, token, user);
  }

  async sendOTPEmail(
    to: string,
    otp: string,
    user: { name: string; profilePictureUrl: string },
  ) {
    await this.mailer.sendOTPEmail(to, otp, user);
  }

  async sendResetPasswordEmail(
    to: string,
    token: string,
    user: { name: string; profilePictureUrl: string },
  ) {
    await this.mailer.sendResetPasswordEmail(to, token, user);
  }

  async sendOrganizationInvitationEmail(
    to: string,
    token: string,
    organization: { name: string; profilePictureUrl: string },
  ) {
    await this.mailer.sendOrganizationInvitationEmail(to, token, organization);
  }
}
