import { Inject, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { email, QUEUES } from '@repo/queues';

@Injectable()
export class AuthMailerService {
  constructor(
    @Inject('EMAIL_QUEUE')
    private readonly emailQueue: Queue<email.EmailJob>,
  ) {}

  async sendVerificationEmail(
    to: string,
    token: string,
    user: { name: string; profilePictureUrl: string },
  ) {
    await this.emailQueue.add(
      QUEUES.EMAIL_SENDER,
      email.verification({ to, token, user }),
    );
  }

  async sendOTPEmail(
    to: string,
    otp: string,
    user: { name: string; profilePictureUrl: string },
  ) {
    await this.emailQueue.add(
      QUEUES.EMAIL_SENDER,
      email.otp({ to, otp, user }),
    );
  }

  async sendResetPasswordEmail(
    to: string,
    token: string,
    user: { name: string; profilePictureUrl: string },
  ) {
    await this.emailQueue.add(
      QUEUES.EMAIL_SENDER,
      email.resetPassword({ to, token, user }),
    );
  }

  async sendResetPasswordConfirmationEmail(
    to: string,
    resetAt: string,
    user: { name: string; profilePictureUrl: string },
  ) {
    await this.emailQueue.add(
      QUEUES.EMAIL_SENDER,
      email.resetPasswordConfirmation({ to, resetAt, user }),
    );
  }
}
