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
    const userData = await this.userService.findOneById(user.id);
    await this.userService.updateUserAvatar(userData, avatarCustomizationDto);

    return {
      success: true,
      message: 'Avatar customization saved successfully',
    };
  }
}
