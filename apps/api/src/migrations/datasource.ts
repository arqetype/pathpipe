import { DataSource } from 'typeorm';
import { resolve } from 'node:path';

import { User } from '@repo/db/entities/user';
import { EmailVerificationToken } from '@repo/db/entities/email-verification-token';
import { OTPVerification } from '@repo/db/entities/otp-verification';
import { ResetPasswordToken } from '@repo/db/entities/reset-password-token';
import { Application } from '@repo/db/entities/application';
import { Company } from '@repo/db/entities/company';
import { CompanyWatch } from '@repo/db/entities/company-watch';
import { JobPosting } from '@repo/db/entities/job-posting';
import { ApiKey } from '@repo/db/entities/api-key';

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.NEST_DATABASE_HOST,
  port: parseInt(process.env.NEST_DATABASE_PORT, 10),
  username: process.env.NEST_DATABASE_USER,
  password: process.env.NEST_DATABASE_PASS,
  database: process.env.NEST_DATABASE_NAME,
  entities: [
    User,
    EmailVerificationToken,
    OTPVerification,
    ResetPasswordToken,
    Application,
    Company,
    CompanyWatch,
    JobPosting,
    ApiKey,
  ],
  migrations: [resolve(__dirname, 'common/*.{ts,js}')],
  synchronize: false,
  migrationsRun: true,
});
