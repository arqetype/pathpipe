import React from 'react';
import { createTransport, Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import { VerificationEmail } from './templates/auth/verification-email';
import { OTPEmail } from './templates/auth/otp-email';
import { ResetPasswordEmail } from './templates/auth/reset-password-email';
import OrganizationInvitationEmail from './templates/organization/invitation-email';

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

  public async sendVerificationEmail(
    to: string,
    token: string,
    user: { name: string; profilePictureUrl: string },
  ): Promise<void> {
    const html = await render(<VerificationEmail token={token} user={user} />);

    try {
      await this.transporter.sendMail({
        to,
        from: this.from,
        subject: 'Weaver : Verify your email address',
        html,
      });
    } catch {
      throw new Error('Failed to send email');
    }
  }

  public async sendOTPEmail(
    to: string,
    otp: string,
    user: { name: string; profilePictureUrl: string },
  ): Promise<void> {
    const html = await render(<OTPEmail otp={otp} user={user} />);

    try {
      await this.transporter.sendMail({
        to,
        from: this.from,
        subject: 'Weaver : Your OTP code',
        html,
      });
    } catch {
      throw new Error('Failed to send email');
    }
  }

  public async sendResetPasswordEmail(
    to: string,
    token: string,
    user: { name: string; profilePictureUrl: string },
  ): Promise<void> {
    const html = await render(<ResetPasswordEmail token={token} user={user} />);

    try {
      await this.transporter.sendMail({
        to,
        from: this.from,
        subject: 'Weaver : Reset your password',
        html,
      });
    } catch {
      throw new Error('Failed to send email');
    }
  }

  public async sendOrganizationInvitationEmail(
    to: string,
    token: string,
    organization: { name: string; profilePictureUrl: string },
  ): Promise<void> {
    const html = await render(
      <OrganizationInvitationEmail token={token} organization={organization} />,
    );

    try {
      await this.transporter.sendMail({
        to,
        from: this.from,
        subject: `Weaver : Invitation to join ${organization.name}`,
        html,
      });
    } catch {
      throw new Error('Failed to send organization invitation email');
    }
  }
}
