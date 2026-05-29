import {
  IsString,
  IsNotEmpty,
  Matches,
  Length,
  IsIn,
  IsBoolean,
} from 'class-validator';

export class EnableOtpDto {
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'OTP must be a 6-digit number' })
  otp: string;
}

export class EnableOtpResponseDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['OTP disabled successfully', 'OTP enabled successfully'])
  message: 'OTP disabled successfully' | 'OTP enabled successfully';
}

export class EnableOtpGetResponseDto {
  @IsBoolean()
  success: boolean;
}
