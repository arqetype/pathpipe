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
  UnauthorizedException,
  BadRequestException,
  Delete,
  Param,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { SignInDto, SignInResponseDto } from '@repo/db/dto/auth/sign-in.dto';
import { SignUpDto, SignUpResponseDto } from '@repo/db/dto/auth/sign-up.dto';
import {
  ResendEmailDto,
  ResendEmailResponseDto,
} from '@repo/db/dto/auth/resend-email.dto';
import {
  VerifyEmailDto,
  VerifyEmailResponseDto,
} from '@repo/db/dto/auth/verify-email.dto';
import {
  ResetPasswordDto,
  ResetPasswordResponseDto,
} from '@repo/db/dto/auth/reset-password.dto';
import {
  EnableOtpDto,
  EnableOtpGetResponseDto,
  EnableOtpResponseDto,
} from '@repo/db/dto/auth/enable-otp.dto';
import {
  ResetPasswordUserDto,
  ResetPasswordUserResponseDto,
} from '@repo/db/dto/auth/reset-password-user.dto';
import {
  ForgotPasswordDto,
  ForgotPasswordResponseDto,
} from '@repo/db/dto/auth/forgot-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { LocalAuthGuard } from './guards/local.auth.guard';
import type { Response, Request } from 'express';
import { User } from '@repo/db/entities/user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { GoogleCallbackGuard } from './guards/google-callback.guard';
import { LinkedinCallbackGuard } from './guards/linkedin-callback.guard';
import { ApiKeyService } from './api-key.service';
import { UserRole } from '@repo/db/types/user/roles';
import { Roles } from '../common/decorators/roles.decorator';
import { UserService } from '../features/user/user.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  // SIGN IN / SIGN UP FLOW
  @HttpCode(HttpStatus.OK)
  @UseGuards(LocalAuthGuard)
  @Public()
  @Post('sign-in')
  signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignInResponseDto> {
    return Promise.resolve(this.authService.signIn(signInDto.email, response));
  }

  @HttpCode(HttpStatus.CREATED)
  @Public()
  @Post('sign-up')
  async signUp(@Body() signUpDto: SignUpDto): Promise<SignUpResponseDto> {
    return await this.authService.signUp(
      signUpDto.name,
      signUpDto.email,
      signUpDto.password,
    );
  }

  // ---- ENABLE OTP FLOW ----------------------
  @HttpCode(HttpStatus.OK)
  @Get('enable-otp')
  async enableOtpGet(
    @CurrentUser() user: User,
  ): Promise<EnableOtpGetResponseDto> {
    return await this.authService.sendOTP(user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('enable-otp')
  async enableOtpPost(
    @CurrentUser() user: User,
    @Body() enableOtpDto: EnableOtpDto,
  ): Promise<EnableOtpResponseDto> {
    const { success } = await this.authService.verifyOTP(
      user,
      enableOtpDto.otp,
    );

    if (success) {
      if (user.need_otp) {
        await this.userService.disableOtp(user);
        return { message: 'OTP disabled successfully' };
      } else {
        await this.userService.enableOtp(user);
        return { message: 'OTP enabled successfully' };
      }
    } else {
      throw new UnauthorizedException('Invalid OTP');
    }
  }

  // EMAIL VERIFICATION FLOW
  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('verify-email')
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<VerifyEmailResponseDto> {
    return await this.authService.verifyEmail(verifyEmailDto.token);
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('resend-email')
  async resendEmail(
    @Body() resendEmailDto: ResendEmailDto,
  ): Promise<ResendEmailResponseDto> {
    const user = await this.userService.findOneByEmail(resendEmailDto.email);

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return await this.authService.sendVerification(user);
  }

  // RESET PASSWORD FLOW
  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    const user = await this.userService.findOneByEmail(forgotPasswordDto.email);

    if (user) {
      if (user.is_google_user || user.is_linkedin_user) {
        return {
          success: true,
          message: user.is_linkedin_user
            ? 'You cannot reset your password as you signed up with LinkedIn. Please sign in using your LinkedIn account or contact support for assistance.'
            : 'You cannot reset your password as you signed up with Google. Please sign in using your Google account or contact support for assistance.',
          is_google_user: user.is_google_user,
          is_linkedin_user: user.is_linkedin_user,
          provider_detected: true,
        };
      }

      await this.authService.forgotPassword(user);
    }

    return {
      success: true,
      message: 'If the email exists, a reset link has been sent.',
    };
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('reset-password')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
  ): Promise<ResetPasswordResponseDto> {
    return await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('reset-password/user')
  async getResetPasswordUser(
    @Body() resetPasswordUser: ResetPasswordUserDto,
  ): Promise<ResetPasswordUserResponseDto> {
    const user = await this.authService.getResetPasswordUser(
      resetPasswordUser.token,
    );

    return user;
  }

  // GOOGLE AUTHENTICATION FLOW
  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleCallbackGuard)
  @Public()
  @Get('google')
  async googleAuth() {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(GoogleCallbackGuard)
  @Public()
  @Get('google/callback')
  googleCallback(@Req() req: Request, @Res() res: Response) {
    if (req.query && req.query.error) {
      return res.redirect(
        `${process.env.NEST_FRONT_URL}/app/sign-in?error=google_auth_failed`,
      );
    }

    if (req.user) {
      const token = this.authService.generateJwtToken((req.user as User).email);

      return res.redirect(
        `${process.env.NEST_FRONT_URL}/app/google/callback?token=${token}`,
      );
    }
  }

  // LINKEDIN AUTHENTICATION FLOW
  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedinCallbackGuard)
  @Public()
  @Get('linkedin')
  async linkedinAuth() {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(LinkedinCallbackGuard)
  @Public()
  @Get('linkedin/callback')
  linkedinCallback(@Req() req: Request, @Res() res: Response) {
    if (req.query && req.query.error) {
      return res.redirect(
        `${process.env.NEST_FRONT_URL}/app/sign-in?error=linkedin_auth_failed`,
      );
    }

    if (req.user) {
      const token = this.authService.generateJwtToken((req.user as User).email);

      return res.redirect(
        `${process.env.NEST_FRONT_URL}/app/linkedin/callback?token=${token}`,
      );
    }

    return res.redirect(
      `${process.env.NEST_FRONT_URL}/app/sign-in?error=linkedin_auth_failed`,
    );
  }

  // API KEYS MANAGEMENT FOR ADMIN
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.ADMIN)
  @Get('api-keys')
  getApiKeys(@CurrentUser() user: User) {
    return this.apiKeyService.findAll(user.id);
  }

  @HttpCode(HttpStatus.CREATED)
  @Roles(UserRole.ADMIN)
  @Post('api-keys')
  async createApiKey(@CurrentUser() user: User, @Body('name') name: string) {
    const apiKey = await this.apiKeyService.create(name, user);

    return apiKey;
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(UserRole.ADMIN)
  @Delete('api-keys/:id/revoke')
  revokeApiKey(@Param('id') id: string) {
    return this.apiKeyService.revoke(id);
  }
}
