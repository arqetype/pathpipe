import {
  IsString,
  IsUUID,
  Matches,
  MinLength,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import type { UUID } from 'node:crypto';

@ValidatorConstraint({ name: 'PasswordMatch', async: false })
export class PasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: string, args: ValidationArguments) {
    const object = args.object as ResetPasswordDto;
    return object.newPassword === confirmPassword;
  }

  defaultMessage() {
    return 'Password and confirm password do not match';
  }
}

export class ResetPasswordDto {
  @IsUUID()
  token: UUID;

  @IsString()
  @MinLength(8, {
    message: 'Password is too short',
  })
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: 'Password is too weak',
  })
  newPassword: string;

  @IsString()
  @Validate(PasswordMatchConstraint)
  confirmPassword: string;
}
