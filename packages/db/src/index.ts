import { User } from './entities/user';
import { Meal } from './entities/meal';
import { AIRequest } from './entities/ai-request';
import { Goal } from './entities/goal';
import { EmailVerificationToken } from './entities/email-verification-token';

import { SignInDto } from './dto/sign-in.dto';
import { SignUpDto } from './dto/sign-up.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendEmailDto } from './dto/resend-email.dto';

export default {
  entities: {
    User,
    Meal,
    AIRequest,
    Goal,
    EmailVerificationToken,
  },
  dto: {
    SignInDto,
    SignUpDto,
    VerifyEmailDto,
    ResendEmailDto,
  },
};
