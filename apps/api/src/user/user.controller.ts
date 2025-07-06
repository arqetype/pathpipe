import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@repo/db/entities/user';
import AvatarCustomizationDto from '@repo/db/dto/settings/avatar-customization.dto';
import { UserService } from './user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @HttpCode(HttpStatus.OK)
  @Get('me')
  getMe(@CurrentUser() user: User) {
    // NOTE: don't return the password in the response
    user = { ...user, password: '••••••••••' };
    return user;
  }

  @HttpCode(HttpStatus.OK)
  @Post('avatar/preview')
  getAvatarPreview(
    @CurrentUser() user: User,
    @Body() avatarCustomizationDto: AvatarCustomizationDto,
  ) {
    const image = this.userService.generateAvatarWithSettings(
      avatarCustomizationDto,
      user.email,
      96,
    );

    return {
      message: 'Avatar customization preview generated successfully',
      image,
    };
  }

  @HttpCode(HttpStatus.OK)
  @Post('avatar/save')
  async saveAvatarCustomization(
    @CurrentUser() user: User,
    @Body() avatarCustomizationDto: AvatarCustomizationDto,
  ) {
    await this.userService.updateUserAvatar(user, avatarCustomizationDto);

    return {
      success: true,
      message: 'Avatar customization saved successfully',
    };
  }
}
