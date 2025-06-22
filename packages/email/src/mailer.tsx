import React from 'react';
import { createTransport, Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import { VerificationEmail } from './templates/verification-email';
import { OTPEmail } from './templates/otp-email';

export type SMTPConfig = {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
};

export class Mailer {
  private readonly transporter: Transporter;
  private readonly from: string;

  constructor(config: SMTPConfig) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: config.auth,
    });
    this.from = config.from;
  }

  public async sendVerificationEmail(to: string, token: string): Promise<void> {
    const html = await render(<VerificationEmail token={token} />);

    try {
      await this.transporter.sendMail({
        to,
        from: this.from,
        subject: 'Mealbud.ai : Verify your email address',
        html,
      });
    } catch {
      throw new Error('Failed to send email');
    }
  }

  public async sendOTPEmail(to: string, otp: string): Promise<void> {
    const html = await render(<OTPEmail otp={otp} />);

    try {
      await this.transporter.sendMail({
        to,
        from: this.from,
        subject: 'Mealbud.ai : Your OTP code',
        html,
      });
    } catch {
      throw new Error('Failed to send email');
    }
  }
}
