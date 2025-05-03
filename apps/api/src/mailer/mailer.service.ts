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
      from: '"Ton App 👋" <no-reply@tonapp.com>',
    });
  }

  async sendWelcome(to: string, name: string) {
    await this.mailer.sendWelcomeEmail(to, name);
  }
}
