import { Injectable } from '@nestjs/common';
import { Mailer } from '@repo/email';

/**
 * Service responsible for sending emails in the application.
 *
 * This service wraps the email functionality from the @repo/email package
 * and provides a standardized interface for sending various types of
 * emails within the application.
 */
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
      from: '"MealBud AI" <no-reply@mealbud.ai>',
    });
  }

  /**
   * Sends an email with a verification link to the specified email address.
   *
   * @param to - The recipient's email address
   * @param token - The verification token to include in the email
   * @returns A promise that resolves when the email is sent
   */
  async sendVerificationEmail(
    to: string,
    token: string,
    user: { name: string; profilePictureUrl: string },
  ) {
    await this.mailer.sendVerificationEmail(to, token, user);
  }

  /**
   * Sends an email with a one-time password (OTP) to the specified email address.
   *
   * @param to - The recipient's email address
   * @param otp - The one-time password to include in the email
   * @returns A promise that resolves when the email is sent
   */
  async sendOTPEmail(
    to: string,
    otp: string,
    user: { name: string; profilePictureUrl: string },
  ) {
    await this.mailer.sendOTPEmail(to, otp, user);
  }

  /**
   * Sends a password reset email with a reset token to the specified email address.
   *
   * @param to - The recipient's email address
   * @param token - The password reset token to include in the email
   * @returns A promise that resolves when the email is sent
   */
  async sendResetPasswordEmail(
    to: string,
    token: string,
    user: { name: string; profilePictureUrl: string },
  ) {
    await this.mailer.sendResetPasswordEmail(to, token, user);
  }
}
