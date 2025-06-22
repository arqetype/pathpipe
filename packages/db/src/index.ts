import { User } from './entities/user';
import { Meal } from './entities/meal';
import { AIRequest } from './entities/ai-request';
import { Goal } from './entities/goal';
import { EmailVerificationToken } from './entities/email-verification-token';

import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendEmailDto } from './dto/resend-email.dto';
import { OTPVerification } from './entities/otp-verification';

export default {
  entities: {
    User,
    Meal,
    AIRequest,
    Goal,
    EmailVerificationToken,
    OTPVerification,
  },
  dto: {
    SignInDto,
    SignUpDto,
    VerifyEmailDto,
    ResendEmailDto,
  },
};
