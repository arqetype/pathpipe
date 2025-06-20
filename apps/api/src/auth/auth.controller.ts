import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Get,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from '@repo/db/dto/sign-in.dto';
import { SignUpDto } from '@repo/db/dto/sign-up.dto';
import { ResendEmailDto } from '@repo/db/dto/resend-email.dto';
import { VerifyEmailDto } from '@repo/db/dto/verify-email.dto';
import { Public } from '../common/decorators/public.decorator';
import { LocalAuthGuard } from './guards/local.auth.guard';
import { Response } from 'express';
import { User } from '@repo/db/entities/user';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Public()
  @Post('sign-in')
  signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.signIn(signInDto.email, response);
  }

  @HttpCode(HttpStatus.CREATED)
  @Public()
  @Post('sign-up')
  async signUp(@Body() signUpDto: SignUpDto) {
    return await this.authService.signUp(signUpDto.email, signUpDto.password);
  }

  @HttpCode(HttpStatus.OK)
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('verify-email')
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return await this.authService.verifyEmail(verifyEmailDto.token);
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('resend-email')
  async resendEmail(@Body() resendEmailDto: ResendEmailDto) {
    return await this.authService.resendEmail(resendEmailDto.email);
  }
}
