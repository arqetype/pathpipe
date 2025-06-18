import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @Post('sign-in')
  signIn(@Body() signInDto: Record<string, any>) {
    return this.authService.signIn(
      signInDto.email as string,
      signInDto.password as string,
    );
  }

  @HttpCode(HttpStatus.CREATED)
  @Post('sign-up')
  signUp(@Body() signUpDto: Record<string, any>) {
    return this.authService.signUp(
      signUpDto.email as string,
      signUpDto.password as string,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Post('verify-email')
  verifyEmail(@Body() verifyEmailDto: Record<string, any>) {
    return this.authService.verifyEmail(verifyEmailDto.token as string);
  }
}
