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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiUnauthorizedResponse,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
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
import { Response, Request } from 'express';
import { User } from '@repo/db/entities/user';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserService } from '../user/user.service';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Authentication')
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
  @ApiOperation({
    summary: 'Sign in user',
    description:
      'Authenticate user with email and password, set authentication cookie',
  })
  @ApiBody({
    type: SignInDto,
    description: 'User credentials for authentication',
  })
  @ApiOkResponse({
    description: 'Successfully authenticated, cookie set',
    type: SignInResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials provided',
  })
  @ApiBadRequestResponse({
    description: 'Invalid request format',
  })
  async signIn(
    @Body() signInDto: SignInDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<SignInResponseDto> {
    return await this.authService.signIn(signInDto.email, response);
  }

  @HttpCode(HttpStatus.CREATED)
  @Public()
  @Post('sign-up')
  @ApiOperation({
    summary: 'Register new user',
    description: 'Create a new user account and send email verification',
  })
  @ApiBody({
    type: SignUpDto,
    description: 'User registration details',
  })
  @ApiCreatedResponse({
    description: 'User account created successfully, verification email sent',
    type: SignUpResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid registration data or email already exists',
  })
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
  @ApiOperation({
    summary: 'Get OTP setup information',
    description:
      'Generate OTP setup information for enabling/disabling two-factor authentication',
  })
  @ApiOkResponse({
    description: 'OTP setup information generated successfully',
    type: EnableOtpGetResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Authentication required or GitHub users cannot enable OTP',
  })
  async enableOtpGet(
    @CurrentUser() user: User,
  ): Promise<EnableOtpGetResponseDto> {
    if (user.is_github_user) {
      throw new UnauthorizedException('GitHub users cannot enable OTP');
    }

    return await this.authService.sendOTP(user);
  }

  @HttpCode(HttpStatus.OK)
  @Post('enable-otp')
  @ApiOperation({
    summary: 'Enable or disable OTP',
    description:
      'Toggle two-factor authentication on/off using OTP verification',
  })
  @ApiBody({
    type: EnableOtpDto,
    description: 'OTP verification code',
  })
  @ApiOkResponse({
    description: 'OTP status changed successfully',
    type: EnableOtpResponseDto,
  })
  @ApiUnauthorizedResponse({
    description:
      'Invalid OTP, authentication required, or GitHub users cannot enable OTP',
  })
  async enableOtpPost(
    @CurrentUser() user: User,
    @Body() enableOtpDto: EnableOtpDto,
  ): Promise<EnableOtpResponseDto> {
    if (user.is_github_user) {
      throw new UnauthorizedException('GitHub users cannot enable OTP');
    }

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
  @ApiOperation({
    summary: 'Verify email address',
    description: 'Verify user email address using verification token',
  })
  @ApiBody({
    type: VerifyEmailDto,
    description: 'Email verification token',
  })
  @ApiOkResponse({
    description: 'Email verified successfully',
    type: VerifyEmailResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired verification token',
  })
  async verifyEmail(
    @Body() verifyEmailDto: VerifyEmailDto,
  ): Promise<VerifyEmailResponseDto> {
    return await this.authService.verifyEmail(verifyEmailDto.token);
  }

  @HttpCode(HttpStatus.OK)
  @Public()
  @Post('resend-email')
  @ApiOperation({
    summary: 'Resend verification email',
    description: 'Send a new email verification link to the user',
  })
  @ApiBody({
    type: ResendEmailDto,
    description: 'User email address',
  })
  @ApiOkResponse({
    description: 'Verification email sent successfully',
    type: ResendEmailResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'User not found with provided email',
  })
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
  @ApiOperation({
    summary: 'Request password reset',
    description: 'Send password reset link to user email if account exists',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'User email address for password reset',
  })
  @ApiOkResponse({
    description: 'Reset link sent if email exists (security response)',
    type: ForgotPasswordResponseDto,
  })
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
  ): Promise<ForgotPasswordResponseDto> {
    const user = await this.userService.findOneByEmail(forgotPasswordDto.email);

    if (user) {
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
  @ApiOperation({
    summary: 'Reset password',
    description: 'Reset user password using reset token and new password',
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Password reset token and new password',
  })
  @ApiOkResponse({
    description: 'Password reset successfully',
    type: ResetPasswordResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired reset token',
  })
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
  @ApiOperation({
    summary: 'Get reset password user info',
    description: 'Get user information associated with password reset token',
  })
  @ApiBody({
    type: ResetPasswordUserDto,
    description: 'Password reset token',
  })
  @ApiOkResponse({
    description: 'User information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string' },
        name: { type: 'string' },
        email: { type: 'string' },
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'Invalid or expired reset token',
  })
  async getResetPasswordUser(
    @Body() resetPasswordUser: ResetPasswordUserDto,
  ): Promise<ResetPasswordUserResponseDto> {
    const user = await this.authService.getResetPasswordUser(
      resetPasswordUser.token,
    );

    return user;
  }

  // GITHUB AUTHENTICATION FLOW
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('github'))
  @Public()
  @Get('github')
  @ApiOperation({
    summary: 'GitHub OAuth login',
    description: 'Redirect to GitHub for OAuth authentication',
  })
  @ApiOkResponse({
    description: 'Redirects to GitHub OAuth authorization page',
  })
  @ApiExcludeEndpoint()
  async githubAuth() {}

  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('github'))
  @Public()
  @Get('github/callback')
  @ApiOperation({
    summary: 'GitHub OAuth callback',
    description:
      'Handle GitHub OAuth callback and redirect with authentication token',
  })
  @ApiOkResponse({
    description: 'Redirects to frontend with authentication token or error',
  })
  @ApiExcludeEndpoint()
  githubCallback(@Req() req: Request, @Res() res: Response) {
    if (req.user) {
      const token = this.authService.generateJwtToken((req.user as User).email);

      return res.redirect(
        `${process.env.NEST_FRONT_URL}/app/github/callback?token=${token}`,
      );
    }

    return res.redirect(
      `${process.env.NEST_FRONT_URL}/app/sign-in?error=github_auth_failed`,
    );
  }
}
