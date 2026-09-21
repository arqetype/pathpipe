import React from 'react';
import { createTransport, Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import { VerificationEmail } from './templates/auth/verification-email';
import { OTPEmail } from './templates/auth/otp-email';
import { ResetPasswordEmail } from './templates/auth/reset-password-email';
import { ResetPasswordConfirmationEmail } from './templates/auth/reset-password-confirmation-email';
import { NewJobAlertEmail } from './templates/jobs/new-job-alert-email';

export type SMTPConfig = {
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  appUrl?: string;
};

export class Mailer {
  private readonly transporter: Transporter;
  private readonly from: string;
  private readonly appUrl: string;

  constructor(config: SMTPConfig) {
    this.transporter = createTransport({
      host: config.host,
      port: config.port,
      secure: config.port === 465,
      auth: config.auth,
    });
    this.from = config.from;
    this.appUrl = config.appUrl ?? 'http://localhost:3000';
  }

  public async sendVerificationEmail(
    to: string,
    token: string,
    user: { name: string; profilePictureUrl: string },
  ): Promise<void> {
    const html = await render(
      <VerificationEmail token={token} user={user} appUrl={this.appUrl} />,
    );

    try {
      await this.transporter.sendMail({
        to,
        from: this.from,
        subject: 'pathpipe : Verify your email address',
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
    const html = await render(
      <OTPEmail otp={otp} user={user} appUrl={this.appUrl} />,
    );

    try {
      await this.transporter.sendMail({
        to,
        from: this.from,
        subject: 'pathpipe : Your OTP code',
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
    const html = await render(
      <ResetPasswordEmail token={token} user={user} appUrl={this.appUrl} />,
    );

    try {
      await this.transporter.sendMail({
        to,
        from: this.from,
        subject: 'pathpipe : Reset your password',
        html,
      });
    } catch {
      throw new Error('Failed to send email');
    }
  }

  public async sendResetPasswordConfirmationEmail(
    to: string,
    resetAt: string,
    user: { name: string; profilePictureUrl: string },
  ): Promise<void> {
    const html = await render(
      <ResetPasswordConfirmationEmail
        resetAt={resetAt}
        user={user}
        appUrl={this.appUrl}
      />,
    );

    try {
      await this.transporter.sendMail({
        to,
        from: this.from,
        subject: 'pathpipe : Your password was changed',
        html,
      });
    } catch {
      throw new Error('Failed to send email');
    }
  }

  public async sendNewJobAlertEmail(
    to: string,
    user: { name: string },
    jobCount: number,
    jobs: Array<{
      title: string;
      url: string;
      companyName: string;
      location?: string;
      matchScore?: number;
    }>,
  ): Promise<void> {
    const html = await render(
      <NewJobAlertEmail
        userName={user.name}
        jobCount={jobCount}
        jobs={jobs}
        appUrl={this.appUrl}
      />,
    );

    try {
      await this.transporter.sendMail({
        to,
        from: this.from,
        subject: `pathpipe : ${jobCount} new offer${jobCount > 1 ? 's' : ''} matching your profile`,
        html,
      });
    } catch {
      throw new Error('Failed to send email');
    }
  }
}
