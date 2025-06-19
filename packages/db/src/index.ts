import { User } from './entities/user';
import { Meal } from './entities/meal';
import { AIRequest } from './entities/ai-request';
import { Goal } from './entities/goal';
import { EmailVerificationToken } from './entities/email-verification-token';

import { SignInDto } from './dto/signIn.dto';
import { SignUpDto } from './dto/signUp.dto';
import { VerifyEmailDto } from './dto/verifyEmail.dto';

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
  },
};
