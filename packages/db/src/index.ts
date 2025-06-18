import { User } from './entities/user';
import { Meal } from './entities/meal';
import { AIRequest } from './entities/ai-request';
import { Goal } from './entities/goal';
import { EmailVerificationToken } from './entities/email-verification-token';

export default {
  entities: {
    User,
    Meal,
    AIRequest,
    Goal,
    EmailVerificationToken,
  },
};
