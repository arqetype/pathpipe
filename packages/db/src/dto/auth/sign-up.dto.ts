import {
  IsBoolean,
  IsEmail,
  IsString,
  Matches,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'PasswordMatch', async: false })
export class PasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const object = args.object as SignUpDto;
    return object.password === confirmPassword;
  }

  defaultMessage() {
    return 'Password and confirm password do not match';
  }
}

@ValidatorConstraint({ name: 'TermsAccepted', async: false })
export class TermsAcceptedConstraint implements ValidatorConstraintInterface {
  validate(terms: boolean) {
    return terms === true;
  }

  defaultMessage() {
    return 'You must accept the terms and conditions to sign up';
  }
}

export class SignUpDto {
  @IsString()
  @MinLength(1, {
    message: 'Name must not be empty',
  })
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, {
    message: 'Password is too short',
  })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password is too weak',
  })
  password: string;

  @IsString()
  @Validate(PasswordMatchConstraint)
  confirmPassword: string;

  @IsBoolean()
  @Validate(TermsAcceptedConstraint)
  terms: boolean;
}
