import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
  Get,
  Res,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto } from '@repo/db/dto/auth/sign-in.dto';
import { SignUpDto } from '@repo/db/dto/auth/sign-up.dto';
import { ResendEmailDto } from '@repo/db/dto/auth/resend-email.dto';
import { VerifyEmailDto } from '@repo/db/dto/auth/verify-email.dto';
import { ResetPasswordDto } from '@repo/db/dto/auth/reset-password.dto';
import { ForgotPasswordDto } from '@repo/db/dto/auth/forgot-password.dto';
import { VerifyPasswordDto } from '@repo/db/dto/auth/verify-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { LocalAuthGuard } from './guards/local.auth.guard';
import { Response, Request } from 'express';
import { User } from '@repo/db/entities/user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserService } from '../user/user.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
  ) {}

  // SIGN IN / SIGN UP FLOW
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
    return await this.authService.signUp(
      signUpDto.name,
      signUpDto.email,
      signUpDto.password,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Get('me')
  getMe(@CurrentUser() user: User) {
    return user;
  }

  // EMAIL VERIFICATION FLOW
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
    const user = await this.userService.findOneByEmail(resendEmailDto.email);
    if (!user) {
      throw new Error('User not found');
    }

    return await this.authService.sendVerification(user);
  }

  // RESET PASSWORD FLOW
  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('forgot-password')
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    const user = await this.userService.findOneByEmail(forgotPasswordDto.email);
    if (!user) {
      return {
        success: true,
        message: 'If the email exists, a reset link has been sent.',
      };
    }

    return await this.authService.forgotPassword(user);
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Get('verify-password')
  async verifyForgotPassword(@Body() verifyPasswordDto: VerifyPasswordDto) {
    return await this.authService.verifyForgotPassword(verifyPasswordDto.token);
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  // GITHUB AUTHENTICATION FLOW
  @Public()
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {}

  @Public()
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  githubCallback(@Req() req: Request, @Res() res: Response) {
    if (req.user) {
      const token = this.authService.generateJwtToken((req.user as User).email);

      return res.redirect(
        `${process.env.NEST_FRONT_URL}/auth/github/callback?token=${token}`,
      );
    }

    return res.redirect(
      `${process.env.NEST_FRONT_URL}/app/sign-in?error=github_auth_failed`,
    );
  }
}
