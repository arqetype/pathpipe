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

export class SignUpDto {
  @IsString()
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
  @Matches(/true/i, {
    message: 'You must accept the terms and conditions',
  })
  termsAccepted: boolean;
}
